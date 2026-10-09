// One stable control, release outside it still hides immediately.
export function bindHold(control,{show,hide,documentTarget=document,windowTarget=window}){
 let holding=false,pointer=null;
 const release=()=>{if(!holding)return;holding=false;pointer=null;hide();};
 control.addEventListener('pointerdown',e=>{if(control.disabled||holding||(e.button!==undefined&&e.button!==0))return;e.preventDefault();holding=true;pointer=e.pointerId;control.focus();control.setPointerCapture?.(e.pointerId);show();});
 const pointerEnd=e=>{if(pointer!==null&&(e.pointerId===undefined||e.pointerId===pointer))release();};
 control.addEventListener('pointerleave',pointerEnd);
 control.addEventListener('lostpointercapture',pointerEnd);
 documentTarget.addEventListener('pointerup',pointerEnd);
 documentTarget.addEventListener('pointercancel',pointerEnd);
 documentTarget.addEventListener('pointermove',e=>{if(pointer===null||e.pointerId!==pointer)return;const r=control.getBoundingClientRect?.();if(r&&Number.isFinite(e.clientX)&&Number.isFinite(e.clientY)&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))release();});
 control.addEventListener('keydown',e=>{if(e.key!==' '&&e.key!=='Enter')return;e.preventDefault();if(!holding&&!control.disabled&&!e.repeat){holding=true;pointer=null;show();}});
 control.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();release();}});
 control.addEventListener('blur',release);
 windowTarget.addEventListener('blur',release);
 windowTarget.addEventListener('pagehide',release);
 documentTarget.addEventListener('visibilitychange',()=>{if(documentTarget.visibilityState==='hidden')release();});
 control.addEventListener('contextmenu',e=>e.preventDefault());
 return {release};
}
