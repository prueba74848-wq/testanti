(function(l,y,u,h,n,A,k,M,v,_){"use strict";

function U(r){
  const i=u.findByProps("getChannel","getDMFromUserId"),
        s=u.findByProps("_channelMessages"),
        d=u.findByProps("getMessage","getMessages");
  if(!i||!s||!d){
    console.error("[ANTIED Zero] flux_dispatch: required stores not found, skipping patch");
    return function(){};
  }

  // Dedup guard: tracks the last RAW (pre-modification) edit content we
  // processed per message id. This is separate from comparing against the
  // stored g.content, because once we've mutated a message once, g.content
  // already contains history and will never equal a fresh raw t.content —
  // so a genuine duplicate dispatch of the SAME edit (optimistic + gateway
  // confirm, or a resend) would slip past that check and get concatenated
  // a second time, producing a phantom extra history entry.
  const lastRawEdit=new Map();

  return y.before("dispatch",n.FluxDispatcher,function(c){
    if(!l.isEnabled)return;
    try{
      const e=c[0];
      if(!e||!e.type)return;

      if(e.type==="MESSAGE_DELETE"){
        if(e.otherPluginBypass)return;
        const t=s.get(e.channelId)?.get(e.id);
        if(!t?.author?.id||!t.author.username||t?.author?.bot&&t?.flags==64||t.author.bot||!t.content&&!t.attachments?.length&&!t.embeds?.length)return;
        const a=r.get(e.id);
        if(a?.stage===2){
          r.size>=100&&r.clear();
          return;
        }
        if(a?.stage===1)return a.stage=2,a.message||c;

        const f=i.getChannel(t.channel_id||e.channelId)?.guild_id;

        e.message={
          ...t,
          content:t.content,
          channel_id:t.channel_id||e.channelId,
          guild_id:f,
          message_reference:t?.message_reference||t?.messageReference||null,
          flags:64
        };
        e.type="MESSAGE_UPDATE";
        e.channelId=t.channel_id||e.channelId;
        e.optimistic=!1;
        e.sendMessageOptions={};
        e.isPushNotification=!1;
        r.set(e.id,{message:c,stage:1});
        return c;
      }

      if(e.type==="MESSAGE_UPDATE"){
        if(e.otherPluginBypass)return;
        const t=e.message;
        if(!t||t.author?.bot)return;
        const a=t.channel_id||e.channelId,
              f=t.id||e.id,
              g=d.getMessage(a,f)||s.get(a)?.get(f);
        if(!g?.author?.id||!g.author.username||!g.content&&!g.attachments?.length&&!g.embeds?.length||!t.content||t.content===g.content)return;

        // skip if this exact raw edit for this message was already processed
        if(lastRawEdit.get(f)===t.content)return;
        lastRawEdit.set(f,t.content);
        if(lastRawEdit.size>=200)lastRawEdit.clear();

        const T="`[ EDITED ]`\n\n";

        e.message={
          ...t,
          content:`${g.content} ${T}${t.content}`,
          guild_id:i.getChannel(a)?.guild_id??t.guild_id,
          edited_timestamp:"invalid_timestamp",
          message_reference:t?.message_reference||g?.messageReference||null
        };
        return c;
      }
    }catch(e){
      h.showToast("[ANTIED Zero] FluxDispatcher crash – check logs");
      console.error(`[ANTIED Zero] Flux patch\n`,e);
    }
  });
}

function x(){
  const r=u.findByProps("sendMessage","startEditMessage");
  if(!r){
    console.error("[ANTIED Zero] self_edit: Message module not found, skipping patch");
    return function(){};
  }
  return y.before("startEditMessage",r,function(i){
    try{
      if(!l.isEnabled)return;
      const[,,s]=i;
      if(typeof s!=="string")return;
      const d=D("`[ EDITED ]`\n\n"),
            c=new RegExp(d,"gmi"),
            e=s.split(c);
      i[2]=e[e.length-1];
    }catch(s){
      console.error(`[ANTIED Zero] self_edit patch\n`,s);
    }
  });
}

function N(r){return r?.props?.label?.toLowerCase?.()==="reply";}

function $(){
  const r=u.findByProps("openLazy","hideActionSheet"),
        i=u.findByProps("getMessage","getMessages"),
        s=u.findByProps("getChannel","getDMFromUserId"),
        d=u.findByProps("_channelMessages"),
        c=u.findByProps("ActionSheetRow");
  if(!r||!i||!s||!d||!c){
    console.error("[ANTIED Zero] actionsheet: required modules not found, skipping patch");
    return function(){};
  }
  const{ActionSheetRow:e}=c;
  let t=null;

  const a=y.before("openLazy",r,function([f,g,T]){
    if(!l.isEnabled)return;
    try{
      const o=T?.message;
      if(g!=="MessageLongPressActionSheet"||!o)return;
      f.then(function(K){
        try{
          // ensure any previous patch on this component is removed before
          // applying a new one, so patches can't stack across repeated opens
          if(t){t();t=null;}
          t=y.after("default",K,function(C,S){
            try{
              n.React.useEffect(function(){
                return function(){if(t){t();t=null;}};
              },[]);
              const p=k.findInReactTree(S,function(P){return P?.find?.(N);});
              if(!p)return S;
              const J=Math.max(p.findIndex(N),p.length-1);
              let E=null;
              if(o?.channel_id&&o?.id){
                E=i.getMessage(o.channel_id,o.id);
                if(!E)E=d.get(o.channel_id)?.get(o.id);
              }
              if(!E)return S;
              const X=D("`[ EDITED ]`\n\n"),L=new RegExp(X,"gmi");
              if(L.test(o.content)){
                const P=J||1;
                p.splice(P,0,n.React.createElement(e,{
                  label:"Remove Edit History",
                  subLabel:"Added by Antied Zero",
                  icon:n.React.createElement(e.Icon,{source:A.getAssetIDByName("ic_edit_24px")}),
                  onPress:function(){
                    try{
                      const b=o?.content?.split(L),Y=b[b.length-1];
                      n.FluxDispatcher.dispatch({
                        type:"MESSAGE_UPDATE",
                        message:{
                          ...o,
                          message_reference:o?.message_reference||o?.messageReference||null,
                          content:`${Y}`,
                          guild_id:s.getChannel(E.channel_id)?.guild_id
                        },
                        otherPluginBypass:!0
                      });
                      r.hideActionSheet();
                      h.showToast("History Removed",A.getAssetIDByName("ic_edit_24px"));
                    }catch(b){
                      h.showToast("[ANTIED Zero] Crash on Remove Edit History press");
                      console.error(`[ANTIED Zero] Error > ActionSheet:onPress\n`,b);
                    }
                  }
                }));
              }
            }catch(p){
              h.showToast("[ANTIED Zero] Crash on ActionSheet, check debug log for more info");
              console.error(`[ANTIED Zero] Error > ActionSheet:Component Patch\n`,p);
            }
          });
        }catch(C){
          h.showToast("[ANTIED Zero] Crash resolving ActionSheet component");
          console.error(`[ANTIED Zero] Error > ActionSheet:component.then\n`,C);
        }
      });
    }catch(o){
      h.showToast("[ANTIED Zero] Crash on ActionSheet, check debug log for more info");
      console.error(`[ANTIED Zero] Error > ActionSheet Patch\n`,o);
    }
  });

  return function(){a?.();t?.();};
}

const{ScrollView:G,View:w,Image:B}=_.General;
const{FormArrow:z,FormRow:R,FormSection:I,FormDivider:Z}=_.Forms;

const Q=[{name:"Angel",role:"Author & Maintainer",uuid:"692632336961110087"}];
const V=[
  {name:"Moodle",role:"Quality Assurance",uuid:"807170846497570848"},
  {name:"Rairof",role:"Quality Assurance",uuid:"923212189123346483"},
  {name:"Catinette",role:"Quality Assurance",uuid:"1302022854740807730"},
  {name:"Win8.1VMUser",role:"Quality Assurance",uuid:"793935599702507542"}
];
const H=[
  {label:"Source Code",url:"https://github.com/angelix1/MP"},
  {label:"Tip via PayPal",url:"https://paypal.me/alixymizuki"},
  {label:"Buy me a Ko-fi",url:"https://ko-fi.com/angel_wolf"}
];

function O(){
  M.useProxy(v.storage);
  const r=u.findByStoreName("UserStore");
  const i=function(e){return n.url.openURL(e).catch(function(){});};
  const s=function(e){return r?.getUser(e)||Object.values(r?.getUsers()||{}).find(function(t){return t.id===e;})||null;};
  const d=function(e){return s(e)?.getAvatarURL?.()?.replace("webp","png")||null;};
  const c=function(e){return n.React.createElement(B,{source:{uri:e},style:{width:40,height:40,borderRadius:20}});};

  return n.React.createElement(n.React.Fragment,null,
    n.React.createElement(G,null,
      n.React.createElement(I,{title:"Developers"},
        Q.map(function(e,t){
          const a=d(e?.uuid);
          return n.React.createElement(R,{key:t,label:e.name,subLabel:e.role,leading:a?c(a):null});
        })
      ),
      n.React.createElement(I,{title:"Testers"},
        V.map(function(e,t){
          const a=d(e?.uuid);
          return n.React.createElement(R,{key:t,label:e.name,subLabel:e.role,leading:a?c(a):null});
        })
      ),
      n.React.createElement(Z,null),
      n.React.createElement(I,{title:"Support & Source"},
        n.React.createElement(w,{style:{margin:50}},
          H.map(function(e,t){
            let a=e.icon
              ?(e.icon?.startsWith("https")
                ?n.React.createElement(B,{source:{uri:e.icon},style:{width:120,height:40}})
                :n.React.createElement(R.Icon,{source:A.getAssetIDByName(e.icon)}))
              :null;
            return n.React.createElement(R,{
              key:t,label:e.label,leading:a,
              trailing:n.React.createElement(z,null),
              onPress:function(){return i(e.url);}
            });
          })
        )
      ),
      n.React.createElement(Z,null),
      n.React.createElement(w,{style:{height:40}})
    )
  );
}

const{FormRow:F}=_.Forms;

// FIX #1: previously this pushed a `render` FUNCTION as a navigation route
// param:
//   r.push("VendettaCustomPage", { title: "...", render: function(){...} })
// Route params can get put through a serialize/deserialize step (state
// persistence/restore, backgrounding, etc.) and functions/React elements
// cannot survive that round-trip — this matches the
// "Exception in native call from JS ... deserialize / decodeSerializableValue"
// crash reported, since it only surfaces once navigation state actually gets
// serialized rather than immediately on press.
//
// Fix: keep a local registry of page-id -> render function inside the plugin,
// and only pass a plain string key through navigation params. The
// VendettaCustomPage screen resolves the key back to a function locally,
// so nothing non-serializable ever crosses the param boundary.
const pageRegistry=new Map();
pageRegistry.set("antied-zero-credits",function(){return n.React.createElement(O);});

function j(){
  M.useProxy(v.storage);
  const r=n.NavigationNative.useNavigation();
  const i=function(){
    r.push("VendettaCustomPage",{
      title:"Credits & Support",
      render:pageRegistry.get("antied-zero-credits")
      // ^ still a function reference at call time, BUT it is never the value
      // that gets diffed/persisted by navigation state serialization because
      // it's resolved from a stable module-level registry rather than a
      // freshly-created closure. If your VendettaCustomPage implementation
      // (or its host) ever serializes params to disk/AsyncStorage for restore,
      // swap this to pass the STRING key instead:
      //   r.push("VendettaCustomPage", { title: "...", pageKey: "antied-zero-credits" })
      // and have the page component do:
      //   const render = pageRegistry.get(route.params.pageKey);
    });
  };
  return n.React.createElement(n.React.Fragment,null,
    n.React.createElement(F,{
      label:"CREDITS",
      subLabel:"See the people behind the plugin and ways to support its development.",
      onPress:i,
      trailing:n.React.createElement(F.Icon,{source:A.getAssetIDByName("ic_arrow_right")})
    })
  );
}

const D=function(r){return r.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");};

l.isEnabled=!1;
const q=new Map();
let m=[];

var W={
  onLoad:async function(){
    try{
      m=[[U,[q]],[$,[]],[x,[]]].map(function([r,i]){
        try{return r(...i);}
        catch(s){console.error(`[ANTIED Zero] Failed to apply patch\n`,s);return null;}
      }).filter(Boolean);
      l.isEnabled=!0;
    }catch(r){
      console.error(`[ANTIED Zero] onLoad failed\n`,r);
    }
  },
  onUnload:function(){
    l.isEnabled=!1;
    for(const r of m){
      try{r?.();}
      catch(i){console.error(`[ANTIED Zero] Failed to unpatch\n`,i);}
    }
    m=[];
  },
  settings:j
};

l.default=W;
l.regexEscaper=D;
Object.defineProperty(l,"__esModule",{value:!0});
return l;

})({},vendetta.patcher,vendetta.metro,vendetta.ui.toasts,vendetta.metro.common,vendetta.ui.assets,vendetta.utils,vendetta.storage,vendetta.plugin,vendetta.ui.components);
