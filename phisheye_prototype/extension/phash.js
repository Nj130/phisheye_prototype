// phash.js - naive dHash implementation in JS
const phash = (function(){
  // compute dHash of image represented by DataURL; returns hex string
  async function computeHashFromDataUrl(dataUrl) {
    const img = new Image();
    const p = new Promise((res,rej)=>{
      img.onload = () => {
        // resize to 9x8 grayscale, compare adjacent pixels
        const canvas = document.createElement('canvas');
        canvas.width = 9;
        canvas.height = 8;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 9, 8);
        const data = ctx.getImageData(0,0,9,8).data;
        let bits = '';
        for (let y=0;y<8;y++){
          for (let x=0;x<8;x++){
            const i = (y*9 + x)*4;
            const a = (data[i] + data[i+1] + data[i+2]) / 3;
            const b = (data[(y*9 + x +1)*4] + data[(y*9 + x +1)*4+1] + data[(y*9 + x +1)*4+2]) / 3;
            bits += (a > b) ? '1' : '0';
          }
        }
        // convert bits to hex
        let hex='';
        for (let i=0;i<bits.length;i+=4){
          hex += parseInt(bits.substr(i,4),2).toString(16);
        }
        res(hex);
      };
      img.onerror = (e)=>rej(e);
      img.src = dataUrl;
    });
    return p;
  }

  function hammingDistance(hex1, hex2) {
    // convert hex strings -> bit strings
    const b1 = hexToBitString(hex1);
    const b2 = hexToBitString(hex2);
    let d=0;
    for (let i=0;i<b1.length && i<b2.length;i++) if (b1[i] !== b2[i]) d++;
    return d;
  }

  function hexToBitString(h) {
    return h.split('').map(c => parseInt(c,16).toString(2).padStart(4,'0')).join('');
  }

  return {computeHashFromDataUrl, hammingDistance};
})();
