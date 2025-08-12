// content_script.js
(async () => {
  // detect presence of login form fields on the page
  function findCredentialForm() {
    const inputs = Array.from(document.querySelectorAll('input'));
    const hasPwd = inputs.some(i => i.type === 'password' || /password/i.test(i.name));
    const hasEmailLike = inputs.some(i => /email|user|login|username/i.test(i.name));
    if (!hasPwd) return null;
    // choose bounding rect for visible form area (first password field parent)
    const pwd = inputs.find(i => i.type === 'password' || /password/i.test(i.name));
    if (!pwd) return null;
    const container = pwd.closest('form') || pwd.parentElement;
    return {container, pwd};
  }

  // only run analysis if page looks like it could accept credentials
  const result = findCredentialForm();
  if (!result) return;

  // ask background to capture visible tab screenshot
  chrome.runtime.sendMessage({type:'capture_and_check'}, async response => {
    if (!response || !response.ok) {
      console.warn('capture failed', response && response.error);
      return;
    }
    const screenshotDataUrl = response.screenshot;
    // crop screenshot to bounding rect of container to limit sensitive area
    const container = result.container;
    const rect = container.getBoundingClientRect();
    const cropped = await cropDataUrlToRect(screenshotDataUrl, rect);
    // compute pHash + OCR locally
    const hash = await computePHashFromDataUrl(cropped);
    const ocrText = await runOCRFromDataUrl(cropped);
    // perform heuristic domain-brand check
    const domain = window.location.hostname;
    const suspicious = await heuristicCheck(domain, ocrText, hash);
    if (suspicious.highConfidence) {
      showWarningModal(suspicious.message);
    } else if (suspicious.lowConfidence) {
      showAdvisory(suspicious.message);
    }
    // optionally post to server for deeper comparison (privacy-preserving)
    if (suspicious.unknown) {
      // send redacted screenshot (blur inputs) or just feature (phash + OCR)
      fetch('http://localhost:8000/match', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({phash: hash, ocr_text: ocrText, domain})
      }).then(r=>r.json()).then(js=>{
        if (js.similarity_score && js.similarity_score > 0.85) {
          showWarningModal('High visual similarity to a known target — possible phishing.');
        }
      }).catch(e=>{
        console.warn('server match failed', e);
      });
    }
  });

  // helper: crop DataURL by rect using canvas
  async function cropDataUrlToRect(dataUrl, rect) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, rect.width * dpr);
        canvas.height = Math.max(1, rect.height * dpr);
        const ctx = canvas.getContext('2d');
        // draw cropping offset based on viewport
        ctx.drawImage(img, rect.left * dpr, rect.top * dpr, rect.width * dpr, rect.height * dpr, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    });
  }

  async function computePHashFromDataUrl(dataUrl) {
    // phash.js exposes computeHash(imageDataUrl) - see phash.js in this repo
    return await phash.computeHashFromDataUrl(dataUrl);
  }

  async function runOCRFromDataUrl(dataUrl) {
    // uses tesseract worker wrapper
    return await OCRWorker.recognizeDataUrl(dataUrl);
  }

  async function heuristicCheck(domain, ocrText, hash) {
    // simple checks:
    // - Does OCR contain brand name mismatching domain?
    const brands = ['Google', 'Microsoft', 'Amazon', 'Dropbox', 'Facebook', 'Apple', 'Gmail']; // expand DB
    const foundBrands = brands.filter(b => new RegExp('\\b' + b + '\\b', 'i').test(ocrText));
    const domainBrandMismatch = foundBrands.length && !foundBrands.some(b => domain.includes(b.toLowerCase()));
    if (domainBrandMismatch) {
      return {highConfidence:true, message:`Page claims to be ${foundBrands.join(', ')} but domain is ${domain}`};
    }
    // fallback: if pHash is near a canonical hash (you can maintain local cache)
    const localMatches = await localHashMatches(hash);
    if (localMatches.high) return {highConfidence:true, message:'Strong visual match to known target'};
    if (localMatches.weak) return {lowConfidence:true, message:'Weak visual similarity to known brand — be careful'};
    return {unknown:true};
  }

  async function showWarningModal(text) {
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.zIndex = 2147483647;
    el.style.left = '10px';
    el.style.right = '10px';
    el.style.top = '10px';
    el.style.padding = '14px';
    el.style.background = 'linear-gradient(90deg,#ffdddd,#ffefef)';
    el.style.border = '2px solid #cc0000';
    el.style.borderRadius = '8px';
    el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    el.innerHTML = `<strong>PhishEye warning:</strong> ${text} <button id="phish-eye-close">Close</button>`;
    document.documentElement.appendChild(el);
    el.querySelector('#phish-eye-close').onclick = ()=>el.remove();
  }

  async function showAdvisory(text) {
    // less intrusive
    console.warn('PhishEye advisory:', text);
  }

  async function localHashMatches(hash) {
    // compare to known_hashes.json (bundled or stored)
    let db = await fetch(chrome.runtime.getURL('known_hashes.json')).then(r=>r.json());
    // Hamming distance threshold example
    for (let entry of db) {
      const dist = phash.hammingDistance(hash, entry.hash);
      if (dist <= 6) return {high:true, entry};
      if (dist <= 12) return {weak:true, entry};
    }
    return {};
  }

})();
