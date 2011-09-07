FBL.ns(function() { with (FBL) {
var HIGHLIGHTTYPE='boxModel',
    BOXFRAME='border',
    READYTIMEOUT=1,
    
    //
    config=Firebug.getModuleLoaderConfig(),
    modules=[
        "firebug/lib/css",
        "firebug/lib/dom",
        "firebug/lib/events",
        "firebug/firefox/menu",
        "firebug/firefox/tabWatcher"
    ],
    fireTestiePanel=function(){},
    undefined;
    
require(config, modules,function(Css,Dom,Events,Menu){
    fireTestiePanel.prototype = extend(Firebug.Panel,function(){
        var document,readyTimeout,context,styleSheet,ftBox,tmpDoc,
            drawBox=function(){},
            windowX=0,
            windowY=0,
            initialize=function(){
                Firebug.Panel.initialize.apply(this, arguments);
                Firebug.Console.log("initialize");
            },
            ready=function(){
                waitReady();
            },
            waitReady=function(){
                if(!document || !(document instanceof window.Document)){
                    if(window &&
                        window.getBrowser &&
                        window.getBrowser().selectedBrowser &&
                        window.getBrowser().selectedBrowser.contentDocument){
                        document=window.getBrowser().selectedBrowser.contentDocument;
                        readyTimeout && clearTimeout(readyTimeout);
                        
                        start();
                    }else{
                        readyTimeout=setTimeout(function(){
                            waitReady();
                        },1)
                    }
                    try{
                       document=window.getBrowser().selectedBrowser.contentDocument; 
                       
                    }catch(e){
                        
                    };
                }
            },
            start=function(){
                Firebug.Console.log("START!!");
                windowX=document.documentElement.clientWidth;
                windowY=document.documentElement.clientHeight;
                document.defaultView.addEventListener("resize",function(e){
                    windowX=document.documentElement.clientWidth;
                    windowY=document.documentElement.clientHeight;
                },true);
                
                context=Firebug.currentContext;
                
                document.addEventListener("mouseover",onInspectingMouseOver,true);
                document.addEventListener("mouseout",onInspectingMouseOut,true);
                drawBox=function(){
                    ftBox=document.createElement('dialog');
                    var boxStyle=document.createElement('style'),
                        title=document.createElement('h1'),
                        csstable=document.createElement('csstable');
                        layout=document.createElement('layout');
                        
                        ftBox.appendChild(title);
                        ftBox.appendChild(csstable);
                        ftBox.appendChild(layout);
                        
                        boxStyle.innerHTML='dialog dialog h1,dialog h2,dialog h3,dialog h4,dialog h5,dialog h6,dialog p,dialog hr,'+
                                        'dialog article,dialog aside,dialog section,dialog figure,dialog footer,dialog header,dialog'+
                                        'dl,dialog dt,dialog dd,dialog ul,dialog ol,dialog li,dialog th,dialog td,dialog'+
                                        'form,dialog fieldset,dialog input,dialog button,dialog textarea{margin:0;padding:0;}dialog header,'+
                                        'dialog nav,dialog footer,dialog wrapper,dialog csstable,dialog marginbox,dialog contentbox,'+
                                        'dialog paddingbox,dialog borderbox,dialog section{display:block;}dialog button,dialog input,'+
                                        'dialog select,dialog textarea{font:12px/1 Tahoma,Arial;}dialog button,dialog h1,dialog h2,dialog h3,'+
                                        'dialog h4,dialog h5,dialog h6{font-size:100%;font:normal 12px Tahoma,Arial;}dialog li{list-style:none;'+
                                        '}dialog button,dialog input,dialog select,dialog textarea{font-size:100%;border:none;background:none;}'+
                                        'dialog input:focus,dialog textarea:focus{outline:none;}dialog fieldset,dialog img{border:0 none;}'+
                                        'dialog img{vertical-align:middle;}dialog table{border: 0 none !important; margin: 0 !important;padding: border-collapse:collapse;border-spacing:0;}dialog q:'+
                                        'before,dialog q:after{content:"";}dialog address,dialog cite,dialog em{font-style:normal;}dialog{z-index'+
                                        ':2147483647;border:1px solid #eee;display:block;position:absolute;top:200px;left:200px;width:260px;height:'+
                                        'auto;-moz-border-radius:3px;-moz-box-shadow:0 0 10px rgba(0,0,0,0.2);background:#ededed;margin:0;padding:0;text-align: start;}'+
                                        'layout{position:relative;width:100%;height:500px;}dialog h1{margin:0;padding:0;color:#F47A24;font-size:22px;font-weight:bold;'+
                                        'font-family:Arial;line-height:140%;text-indent:5px;border-bottom:1px dashed #d5d5d5;height:31px;text-align:left;'+
                                        '}csstable{font-size:11px;margin:7px auto auto 15px;border-bottom:1px dashed #d5d5d5;}csstable tr{height:18px;'+
                                        '}csstable .cssname{width:75px;font-weight:bold;}marginbox,contentbox,paddingbox,borderbox{margin:25px auto;}'+
                                        'marginbox{width:200px;height:200px;border:1px dashed #000;}borderbox{width:150px;height:150px;border:1px dashed #000;'+
                                        '}paddingbox{width:100px;height:100px;border:1px dashed #000;}contentbox{width:50px;height:50px;border:1px dashed #000;}'+
                                        '.layout-figure{position:absolute;font-size:10px;}.figure_x{top:138px;}.figure_y{right:-134px}'+
                                        '.margin-left{right:-53px;text-align:right;}.margin-right{left:207px;text-align:left;}'+
                                        '.margin-top{top:50px;}.margin-bottom{top:218px;}.border-left{right:-78px;text-align:right;'+
                                        '}.border-right{left:182px;text-align:left;}.border-top{top:79px;'+
                                        '}.border-bottom{top:192px;}.offset-left{right:-26px;text-align:right;'+
                                        '}.offset-right{left:235px;text-align:left;}.offset-top{top:26px;}'+
                                        '.offset-bottom{top:243px;}.padding-left{right:-103px;text-align:right;'+
                                        '}.padding-right{left:157px;text-align:left;}.padding-top{top:105px;}.padding-bottom{'+
                                        'top:169px;}.label-margin{top:38px;left:30px;}.label-border{top:55px;left:55px;}'+
                                        '.label-padding{top:91px;left:81px;}.label-content{left:107px;}.label-offset{left:5px;top:15px;}';
                       
                        ftBox.appendChild(boxStyle);
                        ftBox.style.display='none';
                        document.body.appendChild(ftBox);
                    return function(args){
                        var cssTableInner='<table><tbody>';
                        
                        title.innerHTML=args.title || 'N/A';
                        
                        if(args.css){
                           for(ele in args.css){
                                cssTableInner+=('<tr><td class="cssname">'+ele+'</td><td>'+args.css[ele]+'</td></tr>');
                            } 
                        }
                        cssTableInner+='</tbody></table>';
                        csstable.innerHTML=cssTableInner;
                        
                        layout.innerHTML='<span class="layout-figure offset-left figure_x" id="">'+args.x+'</span>'+
                                     '<span class="layout-figure offset-right figure_x" id="">0</span>'+
                                     '<span class="layout-figure offset-top figure_y" id="">'+args.y+'</span>'+
                                     '<span class="layout-figure offset-bottom figure_y" id="">0</span>'+
                                     '<span class="layout-figure margin-left figure_x" id="">'+args.css['marginLeft']+'</span>'+
                                     '<span class="layout-figure margin-right figure_x" id="">'+args.css['marginRight']+'</span>'+
                                     '<span class="layout-figure margin-top figure_y" id="">'+args.css['marginTop']+'</span>'+
                                     '<span class="layout-figure margin-bottom figure_y" id="">'+args.css['marginBottom']+'</span>'+
                                     '<span class="layout-figure border-left figure_x" id="">'+args.css['borderLeft']+'</span>'+
                                     '<span class="layout-figure border-right figure_x" id="">'+args.css['borderRight']+'</span>'+
                                     '<span class="layout-figure border-top figure_y" id="">'+args.css['borderTop']+'</span>'+
                                     '<span class="layout-figure border-bottom figure_y" id="">'+args.css['borderBottom']+'</span>'+
                                     '<span class="layout-figure padding-left figure_x" id="">'+args.css['paddingLeft']+'</span>'+
                                     '<span class="layout-figure padding-right figure_x" id="">'+args.css['paddingRight']+'</span>'+
                                     '<span class="layout-figure padding-top figure_y" id="">'+args.css['paddingTop']+'</span>'+
                                     '<span class="layout-figure padding-bottom figure_y" id="">'+args.css['paddingBottom']+'</span>'+
                                     '<span class="layout-figure label-margin" id="">Margin</span>'+
                                     '<span class="layout-figure label-border" id="">Border</span>'+
                                     '<span class="layout-figure label-padding" id="">Padding</span>'+
                                     '<span class="layout-figure figure_x label-content" id="">'+args.w+'*'+args.h+'</span>'+
                                     '<span class="layout-figure label-offset" id="">offset</span>'+
                                     '<marginbox><borderbox><paddingbox><contentbox></contentbox></paddingbox></borderbox></marginbox>';
                        //ftBox=inner;
                    }
                }();
                
            },
            
            onInspectingClick=function(e){
                Events.cancelEvent(e);
            },
            onInspectingMouseMove=function(e){
                if(ftBox){
                    var frameOffset=getFrameOffset(e.target.ownerDocument.defaultView);

                    setftBox((e.clientX+10+frameOffset.left),(e.clientY+10+frameOffset.top));

                }
            },
            setftBox=function(x,y){
                ftBox.style.top=(Math.min(y,windowY-390))+"px";
                ftBox.style.left=(Math.min(x,windowX-280))+"px";
                ftBox.style.display='block';
            },
            onInspectingMouseOut=function(e){
                Firebug.Console.log('REMOVE BOX:'+ftBox.tagName);
                if(ftBox!==undefined){
                    ftBox.removeEventListener("mousemove",onInspectingMouseMove,true);
                    ftBox.style.display='none';
                }
                if(e.target.ownerDocument.defaultView.parent!==e.target.ownerDocument.defaultView){
                    e.target.ownerDocument.defaultView.parent.document.addEventListener("mouseover",onInspectingMouseOver,true);
                }
                e.target.ownerDocument.removeEventListener("click",onInspectingClick,true);
            },
            onInspectingMouseOver=function(e){
                Firebug.Console.log(e.target.tagName);
                Firebug.Inspector.highlightObject(e.target,context,HIGHLIGHTTYPE,BOXFRAME,"green");
                e.target.ownerDocument.addEventListener("click",onInspectingClick,true);
 
                var win = (e.target.ownerDocument ? e.target.ownerDocument.defaultView : null),
                    style=(frameDoc||e.currentTarget).defaultView.getComputedStyle(e.target,""),
                    boxStyle=Css.readBoxStyles(style),
                    cssTableInner="",
                    offset = Dom.getLTRBWH(e.target),
                    x = offset.left - Math.abs(boxStyle.marginLeft),
                    y = offset.top - Math.abs(boxStyle.marginTop),
                    w = offset.width - (boxStyle.paddingLeft + boxStyle.paddingRight + boxStyle.borderLeft + boxStyle.borderRight),
                    h = offset.height - (boxStyle.paddingTop + boxStyle.paddingBottom + boxStyle.borderTop + boxStyle.borderBottom);
                
                if(e.target.tagName==='IFRAME' || e.target.tagName==='FRAMESET'){
                    var frameDoc=e.target.contentWindow.document;
                    frameDoc.addEventListener("mouseover",onInspectingMouseOver,true);
                    frameDoc.addEventListener("mouseout",onInspectingMouseOut,true);
                    e.target.contentWindow.parent.document.removeEventListener('mouseover',onInspectingMouseOver,true);

                }
                
                e.target.addEventListener("mousemove",onInspectingMouseMove,true);
                drawBox({
                    title:(e.target.tagName+(e.target.id?('#'+e.target.id):'')),
                    css:boxStyle,
                    x:x,
                    y:y,
                    w:w,
                    h:h
                });

                var frameOffset=getFrameOffset(e.target.ownerDocument.defaultView);

                setftBox((e.clientX+10+frameOffset.left),(e.clientY+10+frameOffset.top));
                ftBox.display='block';
                
                
            },
            getFrameOffset=function(winFrame,offset){
                if(!offset){
                    offset={
                        left:0,
                        top:0
                    };
                }
                var tmp=Dom.getLTRBWH(winFrame.frameElement);
                if(winFrame.parent!==winFrame.parent.parent){
                    
                    getFrameOffset(winFrame.parent,tmp);
                }else{
                    return {
                        left:offset.left+tmp.left,
                        top:offset.top+tmp.top
                    };
                }
            },
            
            show=function(){
                document=undefined;
                ready();
                FBTrace.sysout("shown");
                Firebug.Console.log("shown");
            },
            hide=function(){
                FBTrace.sysout("hidden");
                Firebug.Console.log("hidden");
                try{
                    document.head.removeChild(styleSheet);
                    Firebug.Inspector.clearAllHighlights();
                    document.removeEventListener("mouseover", onInspectingMouseOver, true);
                }catch(e){};
            };
        return{
            name: "FireTestie",
            title: "FireTestie",

            initialize: initialize,
            show:show,
            hide:hide,
        };
    }());
Firebug.registerPanel(fireTestiePanel);
});
}});


