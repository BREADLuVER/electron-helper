"use strict";Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});const f=require("fs"),w=require("path"),u=require("./main-CjdVCuOF.js");/*! node-domexception. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */var d,p;function b(){if(p)return d;if(p=1,!globalThis.DOMException)try{const{MessageChannel:t}=require("worker_threads"),e=new t().port1,r=new ArrayBuffer;e.postMessage(r,[r,r])}catch(t){t.constructor.name==="DOMException"&&(globalThis.DOMException=t.constructor)}return d=globalThis.DOMException,d}var y=b();const M=u.getDefaultExportFromCjs(y),g=t=>Object.prototype.toString.call(t).slice(8,-1).toLowerCase();function F(t){if(g(t)!=="object")return!1;const e=Object.getPrototypeOf(t);return e==null?!0:(e.constructor&&e.constructor.toString())===Object.toString()}var m=function(t,e,r,i,o){if(i==="m")throw new TypeError("Private method is not writable");if(i==="a"&&!o)throw new TypeError("Private accessor was defined without a setter");if(typeof e=="function"?t!==e||!o:!e.has(t))throw new TypeError("Cannot write private member to an object whose class did not declare it");return i==="a"?o.call(t,r):o?o.value=r:e.set(t,r),r},a=function(t,e,r,i){if(r==="a"&&!i)throw new TypeError("Private accessor was defined without a getter");if(typeof e=="function"?t!==e||!i:!e.has(t))throw new TypeError("Cannot read private member from an object whose class did not declare it");return r==="m"?i:r==="a"?i.call(t):i?i.value:e.get(t)},s,c;const E="The requested file could not be read, typically due to permission problems that have occurred after a reference to a file was acquired.";class h{constructor(e){s.set(this,void 0),c.set(this,void 0),m(this,s,e.path,"f"),m(this,c,e.start||0,"f"),this.name=w.basename(a(this,s,"f")),this.size=e.size,this.lastModified=e.lastModified}slice(e,r){return new h({path:a(this,s,"f"),lastModified:this.lastModified,size:r-e,start:e})}async*stream(){const{mtimeMs:e}=await f.promises.stat(a(this,s,"f"));if(e>this.lastModified)throw new M(E,"NotReadableError");this.size&&(yield*f.createReadStream(a(this,s,"f"),{start:a(this,c,"f"),end:a(this,c,"f")+this.size-1}))}get[(s=new WeakMap,c=new WeakMap,Symbol.toStringTag)](){return"File"}}function P(t,{mtimeMs:e,size:r},i,o={}){let n;F(i)?[o,n]=[i,void 0]:n=i;const l=new h({path:t,size:r,lastModified:e});return n||(n=l.name),new u.File([l],n,{...o,lastModified:l.lastModified})}async function S(t,e,r){const i=await f.promises.stat(t);return P(t,i,e,r)}exports.isFile=u.isFile;exports.fileFromPath=S;
