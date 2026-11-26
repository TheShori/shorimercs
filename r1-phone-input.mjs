// Remove presentation characters only; never strip letters or arbitrary content.
export function cleanPhoneInput(value){
 const text=String(value??'');
 if(text.length>80)return text;
 return text.normalize('NFKC')
  .replace(/[\u061c\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/g,'')
  .replace(/[\s().\-\u2010-\u2015\u2212]/g,'')
  .replace(/^00/,'+');
}
export function preparePhoneInput(value){
 const raw=String(value??'');
 if(raw.length>80)throw Error('El teléfono es demasiado largo. Pega solo el número.');
 let text=cleanPhoneInput(raw);
 if(!text)return '';
 if(/^[6789][0-9]{8}$/.test(text))text='+34'+text;
 if(!/^\+[1-9][0-9]{7,14}$/.test(text))throw Error('Revisa el WhatsApp: pega un único número con su prefijo internacional, por ejemplo +52.');
 return text;
}
