/** JavaScript snippets executed inside the page through WebDriver `execute/sync`. */

/** Real visibility (display/visibility/opacity/size), like Selenium's `is_displayed()`. */
export const IS_VISIBLE_SCRIPT =
	'const el=arguments[0]; if(!el||!el.isConnected) return false;' +
	'const s=window.getComputedStyle(el);' +
	"if(s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity)===0) return false;" +
	'const r=el.getBoundingClientRect(); return r.width>0 && r.height>0;';

/** Text and selected attributes of a list of elements. */
export const LIST_ELEMENTS_SCRIPT =
	'const els=arguments[0], attrs=arguments[1];' +
	'return els.map(e=>({text:(e.innerText||e.textContent||"").trim(),' +
	'attributes:Object.fromEntries(attrs.map(a=>[a,e.getAttribute(a)]))}));';

/** Selects an <option> of a <select> by "text", "value" or "index" and fires input/change events. */
export const SELECT_OPTION_SCRIPT =
	'const sel=arguments[0], mode=arguments[1], v=String(arguments[2]);' +
	'const opts=Array.from(sel.options||[]);' +
	"let target=mode==='value'?opts.find(o=>o.value===v):mode==='index'?opts[parseInt(v,10)]:opts.find(o=>o.text.trim()===v.trim());" +
	'if(!target) return false; sel.value=target.value;' +
	"sel.dispatchEvent(new Event('input',{bubbles:true})); sel.dispatchEvent(new Event('change',{bubbles:true}));" +
	'return true;';
