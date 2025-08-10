// ocr_worker.js
const OCRWorker = (function(){
  // please include tesseract.js & tesseract-core.wasm.js in extension files (or load from CDN)
  let worker = null;
  async function init() {
    if (worker) return worker;
    worker = Tesseract.createWorker({
      logger: m => console.log('tesseract', m)
    });
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    return worker;
  }

  async function recognizeDataUrl(dataUrl) {
    await init();
    const { data: { text } } = await worker.recognize(dataUrl);
    return text;
  }

  return {recognizeDataUrl};
})();
