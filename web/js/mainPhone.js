// to avoid caching
//if (window.location.href.indexOf("svn=") == -1) {
//    window.location.href += (window.location.href.indexOf("?") == -1 ? "svn=236" : "&svn=229");
//}

// Variables from the main phone functions
var sTransferNumber;
var oRingTone, oRingbackTone;
var oSipStack, oSipSessionRegister, oSipSessionCall, oSipSessionTransferCall;
var videoRemote, videoLocal, audioRemote;
var bFullScreen = false;
var oNotifICall;
var bDisableVideo = false;
var viewVideoLocal, viewVideoRemote, viewLocalScreencast; // <video> (webrtc) or <div> (webrtc4all)
var oConfigCall;
var oReadyStateTimer;

// Variables from the Expert Options page
var cbVideoDisable;
var cbAVPFDisable;
var txtWebsocketServerUrl;
var txtSIPOutboundProxyUrl;
var txtInfo;

C =
{
    divKeyPadWidth: 220
};

window.onload = function () {
    window.console && window.console.info && window.console.info("location=" + window.location);

    // These have been rearchitected to only get put to the DOM when a call starts, so we can't set them here
    //videoLocal = document.getElementById("video_local");
    //videoRemote = document.getElementById("video_remote");
    audioRemote = document.getElementById("audio_remote");

    document.onkeyup = onKeyUp;
    document.body.onkeyup = onKeyUp;
    divCallCtrl.onmousemove = onDivCallCtrlMouseMove;

    // set debug level
    SIPml.setDebugLevel((window.localStorage && window.localStorage.getItem('org.doubango.expert.disable_debug') == "true") ? "error" : "info");

    loadCredentials();
    loadCallOptions();

    // Initialize call button
    uiBtnCallSetText("Call");

    var getPVal = function (PName) {
        var query = window.location.search.substring(1);
        var vars = query.split('&');
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');
            if (decodeURIComponent(pair[0]) === PName) {
                return decodeURIComponent(pair[1]);
            }
        }
        return null;
    }

    var preInit = function () {
        // set default webrtc type (before initialization)
        var s_webrtc_type = getPVal("wt");
        var s_fps = getPVal("fps");
        var s_mvs = getPVal("mvs"); // maxVideoSize
        var s_mbwu = getPVal("mbwu"); // maxBandwidthUp (kbps)
        var s_mbwd = getPVal("mbwd"); // maxBandwidthUp (kbps)
        var s_za = getPVal("za"); // ZeroArtifacts
        var s_ndb = getPVal("ndb"); // NativeDebug

        if (s_webrtc_type) SIPml.setWebRtcType(s_webrtc_type);

        // initialize SIPML5
        SIPml.init(postInit);

        // set other options after initialization
        if (s_fps) SIPml.setFps(parseFloat(s_fps));
        if (s_mvs) SIPml.setMaxVideoSize(s_mvs);
        if (s_mbwu) SIPml.setMaxBandwidthUp(parseFloat(s_mbwu));
        if (s_mbwd) SIPml.setMaxBandwidthDown(parseFloat(s_mbwd));
        if (s_za) SIPml.setZeroArtifacts(s_za === "true");
        if (s_ndb == "true") SIPml.startNativeDebug();
        //var rinningApps = SIPml.getRunningApps();
        //var _rinningApps = Base64.decode(rinningApps);
        //tsk_utils_log_info(_rinningApps);
    }

    oReadyStateTimer = setInterval(function () {
        if (document.readyState === "complete") {
            clearInterval(oReadyStateTimer);
            // initialize SIPML5
            preInit();
    // Having the password in the local storage is our canary that we can auto-login
console.log( "onLoad - Debug 01", window.localStorage );
    if ( ( window.localStorage.getItem('org.doubango.identity.password') !== null ) && ( window.localStorage.getItem('org.doubango.identity.password') != "" ) ) {
console.log( "onLoad - Debug 02" );
        sipRegister();
    } else {
console.log( "onLoad - Debug 03" );
        var offcanvas_aside = document.getElementById( 'registrationOffcanvas' );
console.log( "onLoad - Debug 04" );
        $('body').toggleClass("offcanvas-active");
console.log( "onLoad - Debug 05" );
        offcanvas_aside.classList.add( "show" );
console.log( "onLoad - Debug 06" );
    }
        }
    },
    500);

    /*if (document.readyState === "complete") {
        preInit();
    }
    else {
        document.onreadystatechange = function () {
            if (document.readyState === "complete") {
                preInit();
            }
        }
    }*/

    // The following code is for the Expert Settings Panel

    cbVideoDisable = document.getElementById("cbVideoDisable");
    cbRTCWebBreaker = document.getElementById("cbRTCWebBreaker");
    txtWebsocketServerUrl = document.getElementById("txtWebsocketServerUrl");
    txtSIPOutboundProxyUrl = document.getElementById("txtSIPOutboundProxyUrl");
    txtInfo = document.getElementById("txtInfo");

    //txtWebsocketServerUrl.disabled = !window.WebSocket || navigator.appName == "Microsoft Internet Explorer"; // Do not use WS on IE
    document.getElementById("btnSave").disabled = !window.localStorage;
    document.getElementById("btnRevert").disabled = !window.localStorage;

    if(window.localStorage){
        settingsRevert(true);
    }
};

function postInit() {
    // check for WebRTC support
    if (!SIPml.isWebRtcSupported()) {
        // is it chrome?
        if (SIPml.getNavigatorFriendlyName() == 'chrome') {
            if (confirm("You're using an old Chrome version or WebRTC is not enabled.\nDo you want to see how to enable WebRTC?")) {
                window.location = 'http://www.webrtc.org/running-the-demos';
            }
            else {
                window.location = "index.php";
            }
            return;
        }
        else {
            if (confirm("webrtc-everywhere extension is not installed. Do you want to install it?\nIMPORTANT: You must restart your browser after the installation.")) {
                window.location = 'https://github.com/sarandogou/webrtc-everywhere';
            }
            else {
                // Must do nothing: give the user the chance to accept the extension
                // window.location = "index.html";
            }
        }
    }

    // checks for WebSocket support
    if (!SIPml.isWebSocketSupported()) {
        if (confirm('Your browser doesn\'t support WebSockets.\nDo you want to download a WebSocket-capable browser?')) {
            window.location = 'https://www.google.com/intl/en/chrome/browser/';
        }
        else {
            window.location = "index.php";
        }
        return;
    }

    if (!SIPml.isWebRtcSupported()) {
        if (confirm('Your browser doesn\'t support WebRTC.\naudio/video calls will be disabled.\nDo you want to download a WebRTC-capable browser?')) {
            window.location = 'https://www.google.com/intl/en/chrome/browser/';
        }
    }

    btnRegister.disabled = false;
    document.body.style.cursor = 'default';
    oConfigCall = {
        audio_remote: audioRemote,
        //video_local: viewVideoLocal,
        //video_remote: viewVideoRemote,
        video_local: null,
        video_remote: null,
        screencast_window_id: 0x00000000, // entire desktop
        bandwidth: { audio: undefined, video: undefined },
        video_size: { minWidth: undefined, minHeight: undefined, maxWidth: undefined, maxHeight: undefined },
        events_listener: { events: '*', listener: onSipEventSession },
        sip_caps: [
            { name: '+g.oma.sip-im' },
            { name: 'language', value: '\"en,fr\"' }
        ]
    };
}

// Function to globally show/hide shortcuts
function uiShowHideShortcuts( show ) {
    var divShortcuts = document.getElementById( 'divShortcuts' );
    var btnShortcutsShowHide = document.getElementById( 'btnShortcutsShowHide' );
    if ( show ) {
        divShortcuts.style.display = 'block';
        divShortcuts.classList.add( 'border-top-separator' );
        btnShortcutsShowHide.value = 'Hide Shortcuts';
        btnShortcutsShowHide.setAttribute( 'onclick', 'uiShowHideShortcuts( 0 )' );
    } else {
        divShortcuts.style.display = 'none';
        divShortcuts.classList.remove( 'border-top-separator' );
        btnShortcutsShowHide.value = 'Show Shortcuts';
        btnShortcutsShowHide.setAttribute( 'onclick', 'uiShowHideShortcuts( 1 )' );
    }
}

// Function to enumerate shortcuts from localstorage object
function shortcutEnum() {
    shortcutsObj = ( "" == window.localStorage.getItem( 'org.doubango.shortcuts' ) ? [] : JSON.parse( window.localStorage.getItem( 'org.doubango.shortcuts' ) ) );
    var divShortcuts = document.getElementById("divShortcuts");
    var divShortcutsButtons = document.getElementById("divShortcutsButtons");
    var btnShortcutsShowHide = document.getElementById( 'btnShortcutsShowHide' );
    if ( shortcutsObj.length == 0 ) {
        btnShortcutsShowHide.disabled = true;
    } else {
        btnShortcutsShowHide.disabled = false;
        divShortcutsButtons.innerHTML = "";
        shortcutsObj.forEach( shortcut => {
                var shortcutBtn = document.createElement('input');
                shortcutBtn.setAttribute( 'type' , 'button' );
                shortcutBtn.setAttribute( 'class' , 'btn btn-primary btn-sm' );
                shortcutBtn.setAttribute( 'id' , 'shortcut' + shortcut.order );
                shortcutBtn.setAttribute( 'onclick' , 'shortcutRun("' + shortcut.order + '");' );
                shortcutBtn.setAttribute( 'value' , shortcut.displayName );
                divShortcutsButtons.appendChild( shortcutBtn );
            }
        );
    }
}

// Function to populate shortcut editor pane
function shortcutsEditDraw() {
    var divShortcutsEditor = document.getElementById( 'divShortcutsEditor' );
    divShortcutsEditor.innerHTML = '';
    shortcutsObj = ( "" == window.localStorage.getItem( 'org.doubango.shortcuts' ) ? [] : JSON.parse( window.localStorage.getItem( 'org.doubango.shortcuts' ) ) );
    shortcutsObj.forEach( shortcut => {
            var divShortcutEditBlock = document.createElement( 'div' );
            divShortcutEditBlock.setAttribute( 'id' , 'shortcutEdit' + shortcut.order );
            divShortcutEditBlock.setAttribute( 'class', 'shortcutEditBlock' );
            var divShortcutEditDisplayName = document.createElement( 'div' );
            divShortcutEditDisplayName.setAttribute( 'class', 'shortcutEditLine' )
            divShortcutEditBlock.appendChild( divShortcutEditDisplayName );
            var labelShortcutDisplayName = document.createElement( 'label' );
            labelShortcutDisplayName.innerText = 'Display Name';
            divShortcutEditDisplayName.appendChild( labelShortcutDisplayName );
            var pShortcutDisplayName = document.createElement( 'p' );
            pShortcutDisplayName.innerText = shortcut.displayName;
            divShortcutEditDisplayName.appendChild( pShortcutDisplayName );
            var divShortcutEditNumber = document.createElement( 'div' );
            divShortcutEditNumber.setAttribute( 'class', 'shortcutEditLine' )
            divShortcutEditBlock.appendChild( divShortcutEditNumber );
            var labelShortcutNumber = document.createElement( 'label' );
            labelShortcutNumber.innerText = 'Number';
            divShortcutEditNumber.appendChild( labelShortcutNumber );
            var pShortcutNumber = document.createElement( 'p' );
            pShortcutNumber.innerText = shortcut.number;
            divShortcutEditNumber.appendChild( pShortcutNumber );
            var divShortcutEditAction = document.createElement( 'div' );
            divShortcutEditAction.setAttribute( 'class', 'shortcutEditLine' )
            divShortcutEditBlock.appendChild( divShortcutEditAction );
            var labelShortcutAction = document.createElement( 'label' );
            labelShortcutAction.innerText = 'Action';
            divShortcutEditAction.appendChild( labelShortcutAction );
            var pShortcutAction = document.createElement( 'p' );
            pShortcutAction.innerText = shortcut.action;
            divShortcutEditAction.appendChild( pShortcutAction );
            divShortcutsEditor.appendChild( divShortcutEditBlock );
            var shortcutEditBtn = document.createElement('input');
            shortcutEditBtn.setAttribute( 'type' , 'button' );
            shortcutEditBtn.setAttribute( 'class' , 'btn btn-primary btn-sm' );
            shortcutEditBtn.setAttribute( 'id' , 'shortcutEdit' + shortcut.order );
            shortcutEditBtn.setAttribute( 'href' , '#' );
            shortcutEditBtn.setAttribute( 'onclick' , 'shortcutEdit("' + shortcut.order + '");' );
            shortcutEditBtn.setAttribute( 'value' , 'Edit' );
            if ( shortcut.noDelete == 1 ) {
                shortcutEditBtn.disabled = 'true';
            }    
            divShortcutEditBlock.appendChild( shortcutEditBtn );
            var shortcutDeleteBtn = document.createElement('input');
            shortcutDeleteBtn.setAttribute( 'type' , 'button' );
            shortcutDeleteBtn.setAttribute( 'class' , 'btn btn-primary btn-sm' );
            shortcutDeleteBtn.setAttribute( 'id' , 'shortcutDelete' + shortcut.order );
            shortcutDeleteBtn.setAttribute( 'href' , '#' );
            shortcutDeleteBtn.setAttribute( 'onclick' , 'shortcutDelete("' + shortcut.order + '");' );
            shortcutDeleteBtn.setAttribute( 'value' , 'Delete' );
            if ( shortcut.noDelete == 1 ) {
                shortcutDeleteBtn.disabled = 'true';
            }    
            divShortcutEditBlock.appendChild( shortcutDeleteBtn );
        }
    );
    var shortcutAddBtn = document.createElement('input');
    shortcutAddBtn.setAttribute( 'type' , 'button' );
    shortcutAddBtn.setAttribute( 'class' , 'btn btn-primary btn-sm' );
    shortcutAddBtn.setAttribute( 'id' , 'shortcutAddBtn' );
    shortcutAddBtn.setAttribute( 'href' , '#' );
    shortcutAddBtn.setAttribute( 'onclick' , 'shortcutAdd();' );
    shortcutAddBtn.setAttribute( 'value' , 'Add' );
    divShortcutsEditor.appendChild( shortcutAddBtn );
    var shortcutReorderBtn = document.createElement('input');
    shortcutReorderBtn.setAttribute( 'type' , 'button' );
    shortcutReorderBtn.setAttribute( 'class' , 'btn btn-primary btn-sm' );
    shortcutReorderBtn.setAttribute( 'id' , 'shortcutReorderBtn' );
    shortcutReorderBtn.setAttribute( 'href' , '#' );
    shortcutReorderBtn.setAttribute( 'onclick' , 'shortcutsOrderDraw();' );
    shortcutReorderBtn.setAttribute( 'value' , 'Reorder' );
    divShortcutsEditor.appendChild( shortcutReorderBtn );
}

// Function to edit a specific shortcut
function shortcutEdit( shortcutSelect ) {
    var shortcutsObj = ( JSON.parse( window.localStorage.getItem( 'org.doubango.shortcuts' ) ) );
    var divShortcutEditBlock = document.getElementById( 'shortcutEdit' + shortcutSelect );
    if ( shortcutsObj[ shortcutSelect ].noDelete == 1 ) {
        var pCantEdit = document.createElement( 'p' );
        pCantEdit.style.textAlign = 'center';
        pCantEdit.style.fontWeight = 'bold';
        pCantEdit.innerText = "This shortcut cannot be edited"
        divShortcutEditBlock.prepend( pCantEdit );
    } else {
        divShortcutEditBlock.innerHTML = "";
        var divShortcutEditDisplayName = document.createElement( 'div' );
        divShortcutEditDisplayName.setAttribute( 'class', 'shortcutEditLine' )
        divShortcutEditBlock.appendChild( divShortcutEditDisplayName );
        var labelShortcutDisplayName = document.createElement( 'label' );
        labelShortcutDisplayName.innerText = 'Display Name';
        divShortcutEditDisplayName.appendChild( labelShortcutDisplayName );
        var inputShortcutDisplayName = document.createElement( 'input' );
        inputShortcutDisplayName.setAttribute( 'type', 'text' );
        inputShortcutDisplayName.setAttribute( 'class', 'shortcutEditInput');
        inputShortcutDisplayName.setAttribute( 'id', 'shortcutEditInputDisplayName' + shortcutSelect );
        inputShortcutDisplayName.setAttribute( 'value', shortcutsObj[shortcutSelect].displayName );
        divShortcutEditDisplayName.appendChild( inputShortcutDisplayName );
        var divShortcutEditNumber = document.createElement( 'div' );
        divShortcutEditNumber.setAttribute( 'class', 'shortcutEditLine' )
        divShortcutEditBlock.appendChild( divShortcutEditNumber );
        var labelShortcutNumber = document.createElement( 'label' );
        labelShortcutNumber.innerText = 'Number';
        divShortcutEditNumber.appendChild( labelShortcutNumber );
        var inputShortcutNumber = document.createElement( 'input' );
        inputShortcutNumber.setAttribute( 'type', 'text' );
        inputShortcutNumber.setAttribute( 'class', 'shortcutEditInput');
        inputShortcutNumber.setAttribute( 'id', 'shortcutEditInputNumber' + shortcutSelect );
        inputShortcutNumber.setAttribute( 'value', shortcutsObj[shortcutSelect].number );
        divShortcutEditNumber.appendChild( inputShortcutNumber );
        var divShortcutEditAction = document.createElement( 'div' );
        divShortcutEditAction.setAttribute( 'class', 'shortcutEditLine' )
        divShortcutEditBlock.appendChild( divShortcutEditAction );
        var labelShortcutAction = document.createElement( 'label' );
        labelShortcutAction.innerText = 'Action';
        divShortcutEditAction.appendChild( labelShortcutAction );
        var inputShortcutAction = document.createElement( 'select' );
        inputShortcutAction.setAttribute( 'class', 'shortcutEditInput');
        inputShortcutAction.setAttribute( 'id', 'shortcutEditInputAction' + shortcutSelect );
        divShortcutEditAction.appendChild( inputShortcutAction );
        var optionAudio = document.createElement("option");
        optionAudio.text = "Audio";
        inputShortcutAction.add( optionAudio );
        var optionVideo = document.createElement("option");
        optionVideo.text = "Video";
        inputShortcutAction.add( optionVideo );
        var optionScreenshare = document.createElement("option");
        optionScreenshare.text = "Screenshare";
        inputShortcutAction.add( optionScreenshare );
        var optionChat = document.createElement("option");
        optionChat.text = "Chat";
        inputShortcutAction.add( optionChat );
        var optionDTMF = document.createElement("option");
        optionDTMF.text = "DTMF";
        inputShortcutAction.add( optionDTMF );
        inputShortcutAction.value = shortcutsObj[shortcutSelect].action;
        var inputShortcutOrder = document.createElement( 'input' );
        inputShortcutOrder.setAttribute( 'type', 'hidden' );
        inputShortcutOrder.setAttribute( 'id', 'shortcutEditInputOrder' + shortcutSelect );
        divShortcutEditBlock.appendChild( inputShortcutOrder );
                    
        var shortcutEditSaveBtn = document.createElement('a');
        shortcutEditSaveBtn.setAttribute( 'class' , 'btn btn-primary btn-sm' );
        shortcutEditSaveBtn.setAttribute( 'id' , 'shortcutEditSave' + shortcutSelect );
        shortcutEditSaveBtn.setAttribute( 'href' , '#' );
        shortcutEditSaveBtn.setAttribute( 'onclick' , 'shortcutEditSave("' + shortcutSelect + '");' );
        shortcutEditSaveBtn.innerText = 'Save';
        divShortcutEditBlock.appendChild( shortcutEditSaveBtn );
    }
}

// Function to populate shortcut ordering pane
function shortcutsOrderDraw() {
    var divShortcutsEditor = document.getElementById( 'divShortcutsEditor' );
    divShortcutsEditor.innerHTML = '';
    var pShortcutInstructions = document.createElement( 'p' );
    pShortcutInstructions.innerText = 'Please enter the desired order by inputting the new position for each shortcut in the input box, making sure to start at 1 and avoid skipping any numbers.';
    divShortcutsEditor.appendChild( pShortcutInstructions );
    shortcutsObj = ( "" == window.localStorage.getItem( 'org.doubango.shortcuts' ) ? [] : JSON.parse( window.localStorage.getItem( 'org.doubango.shortcuts' ) ) );
    shortcutsObj.forEach( shortcut => {

            var divShortcutOrderBlock = document.createElement( 'div' );
            divShortcutOrderBlock.setAttribute( 'id' , 'shortcutOrder' + shortcut.order );
            divShortcutOrderBlock.setAttribute( 'class', 'shortcutOrderBlock row' );

            var divShortcutOrderDisplayName = document.createElement( 'div' );
            divShortcutOrderDisplayName.setAttribute( 'class', 'shortcutOrderLine col-12' )
            divShortcutOrderBlock.appendChild( divShortcutOrderDisplayName );
            var pShortcutDisplayName = document.createElement( 'p' );
            pShortcutDisplayName.innerText = "Display Name: " + shortcut.displayName;
            divShortcutOrderDisplayName.appendChild( pShortcutDisplayName );

            var divShortcutOrderNumber = document.createElement( 'div' );
            divShortcutOrderNumber.setAttribute( 'class', 'shortcutOrderLine col-9' )
            divShortcutOrderBlock.appendChild( divShortcutOrderNumber );
            var pShortcutNumber = document.createElement( 'p' );
            pShortcutNumber.innerText = "Number: " + shortcut.number;
            divShortcutOrderNumber.appendChild( pShortcutNumber );

            var divShortcutOrderInput = document.createElement( 'div' );
            divShortcutOrderInput.setAttribute( 'class', 'shortcutOrderLine col-3' );
            divShortcutOrderBlock.appendChild( divShortcutOrderInput );
            var inputShortcutOrder = document.createElement( 'input' );
            inputShortcutOrder.setAttribute( 'type' , 'text' );
            inputShortcutOrder.setAttribute( 'id', 'shortcutOrderInput' + shortcut.order );
            inputShortcutOrder.setAttribute( 'class' , 'shortcutOrderInput' );
            inputShortcutOrder.setAttribute( 'value', shortcut.order + 1 );
            divShortcutOrderInput.appendChild( inputShortcutOrder );

            var divShortcutOrderAction = document.createElement( 'div' );
            divShortcutOrderAction.setAttribute( 'class', 'shortcutOrderLine col-12' )
            divShortcutOrderBlock.appendChild( divShortcutOrderAction );
            var pShortcutAction = document.createElement( 'p' );
            pShortcutAction.innerText = "Action: " + shortcut.action;
            divShortcutOrderAction.appendChild( pShortcutAction );

            var inputShortcutOrderOld = document.createElement( 'input' );
            inputShortcutOrderOld.setAttribute( 'type', 'hidden' );
            inputShortcutOrderOld.setAttribute( 'id', 'shortcutOrderOld' + shortcut.order );
            divShortcutOrderBlock.appendChild( inputShortcutOrderOld );

            divShortcutsEditor.appendChild( divShortcutOrderBlock );

        }
    );
    var shortcutOrderSaveBtn = document.createElement('input');
    shortcutOrderSaveBtn.setAttribute( 'type' , 'button' );
    shortcutOrderSaveBtn.setAttribute( 'class' , 'btn btn-primary btn-sm' );
    shortcutOrderSaveBtn.setAttribute( 'id' , 'shortcutOrderSaveBtn' );
    shortcutOrderSaveBtn.setAttribute( 'href' , '#' );
    shortcutOrderSaveBtn.setAttribute( 'onclick' , 'shortcutOrderSave();' );
    shortcutOrderSaveBtn.setAttribute( 'value' , 'Save' );
    divShortcutsEditor.appendChild( shortcutOrderSaveBtn );
}

// Function to save reordering of shortcuts
function shortcutOrderSave() {
    var shortcutsObj = ( JSON.parse( window.localStorage.getItem( 'org.doubango.shortcuts' ) ) );
    var shortcutsObjNew = [];
    var shortcutCount = shortcutsObj.length;
    var divShortcutsEditor = document.getElementById( 'divShortcutsEditor' );
    var i;
    for ( i = 0; i < shortcutCount; i++ ) {
        var j;
        for ( j = 0; j < shortcutCount; j++ ) {
            var thisShortcutId = document.getElementById( 'shortcutOrderInput' + j );
            var newIndex = document.getElementById( 'shortcutOrderInput' + j ).value - 1;
            if ( newIndex == i ) {
                shortcutsObjNew.push( shortcutsObj[j] );
                shortcutsObjNew[ i ].order = i;
                break;
            }
        };
        if ( shortcutsObjNew.length != i + 1 ) {
            alert( "Invalid shortcut order, please make sure the shortcuts are ordered starting at 1 with no skipped numbers" );
            return;
        }
    }
    window.localStorage.setItem( 'org.doubango.shortcuts', JSON.stringify( shortcutsObjNew ) );
    $.ajax({
        url: 'includes/saveShortcuts.php',
        type: 'POST',
        data: {
            extension:window.localStorage.getItem( 'org.doubango.identity.impi' ),
            shortcuts:window.localStorage.getItem( 'org.doubango.shortcuts' )
        },
        success: function(data) {
            console.log("shortcut Deletion - Successfully Saved", data); // Inspect this in your console
        }
    });
    shortcutEnum();
    shortcutsEditDraw();
}

// Function to idelete a specific shortcut
function shortcutDelete( shortcutSelect ) {
    var shortcutsObj = ( JSON.parse( window.localStorage.getItem( 'org.doubango.shortcuts' ) ) );
    var divShortcutEditBlock = document.getElementById( 'shortcutEdit' + shortcutSelect );
    if ( shortcutsObj[ shortcutSelect ].noDelete == 1 ) {
        var pCantDel = document.createElement( 'p' );
        pCantDel.style.textAlign = 'center';
        pCantDel.style.fontWeight = 'bold';
        pCantDel.innerText = "This shortcut cannot be deleted"
        divShortcutEditBlock.prepend( pCantDel );
    } else {
        shortcutsObj.splice( shortcutSelect, 1 );
        var order = 0;
        shortcutsObj.forEach( shortcut => {
                shortcut.order = order++;
            }
        );
        window.localStorage.setItem('org.doubango.shortcuts', JSON.stringify(shortcutsObj));
        $.ajax({
            url: 'includes/saveShortcuts.php',
            type: 'POST',
            data: {
                extension:window.localStorage.getItem( 'org.doubango.identity.impi' ),
                shortcuts:window.localStorage.getItem( 'org.doubango.shortcuts' )
            },
            success: function(data) {
                console.log("shortcut Deletion - Successfully Saved", data); // Inspect this in your console
            }
        });
        shortcutEnum();
        shortcutsEditDraw();
    }
}

// Function to write changes to a shortcut
function shortcutEditSave( shortcutSelect ) {
    var shortcutsObj = ( JSON.parse( window.localStorage.getItem( 'org.doubango.shortcuts' ) ) );
    var shortcutNextOrder = shortcutsObj.length;
    if ( document.getElementById( 'shortcutEditInputAction' + shortcutSelect ).value == 'DTMF' ) {
        if ( ! /^[0-9A-D#\*]+$/.test(  document.getElementById( 'shortcutEditInputNumber' + shortcutSelect ).value ) ) {
            alert( "Invalid DTMF Character, Please only use 0-9. A-D, * or #" );
            return;
        }
    }
    if ( shortcutNextOrder == shortcutSelect ) {
        let shortcut = {
            "order": Number(shortcutSelect),
            "number": document.getElementById( 'shortcutEditInputNumber' + shortcutSelect ).value,
            "displayName": document.getElementById( 'shortcutEditInputDisplayName' + shortcutSelect ).value,
            "noDelete": 0,
            "action": document.getElementById( 'shortcutEditInputAction' + shortcutSelect ).value
        }
        shortcutsObj.push( shortcut );
    } else {
        shortcutsObj[ shortcutSelect ].displayName = document.getElementById( 'shortcutEditInputDisplayName' + shortcutSelect ).value;
        shortcutsObj[ shortcutSelect ].number = document.getElementById( 'shortcutEditInputNumber' + shortcutSelect ).value;
        shortcutsObj[ shortcutSelect ].action = document.getElementById( 'shortcutEditInputAction' + shortcutSelect ).value;
    }
    window.localStorage.setItem('org.doubango.shortcuts', JSON.stringify(shortcutsObj));
    $.ajax({
        url: 'includes/saveShortcuts.php',
        type: 'POST',
        data: {
            extension:window.localStorage.getItem( 'org.doubango.identity.impi' ),
            shortcuts:window.localStorage.getItem( 'org.doubango.shortcuts' )
        },
        success: function(data) {
            console.log("Shortcut Edit - Successfully Saved", data);
        }
    });
    shortcutEnum();
    shortcutsEditDraw();
}

// Function to add a shortcut
function shortcutAdd() {
    shortcutAddBtn = document.getElementById( 'shortcutAddBtn' );
    shortcutAddBtn.remove();
    var shortcutsObj = ( JSON.parse( window.localStorage.getItem( 'org.doubango.shortcuts' ) ) );
    var shortcutNextOrder = shortcutsObj.length;
    var divShortcutEditBlock = document.createElement( 'div' );
    divShortcutEditBlock.setAttribute( 'id' , 'shortcutEdit' + shortcutNextOrder );
    divShortcutEditBlock.setAttribute( 'class', 'shortcutEditBlock' );
    divShortcutsEditor.appendChild( divShortcutEditBlock );
    var divShortcutEditDisplayName = document.createElement( 'div' );
    divShortcutEditDisplayName.setAttribute( 'class', 'shortcutEditLine' )
    divShortcutEditBlock.appendChild( divShortcutEditDisplayName );
    var labelShortcutDisplayName = document.createElement( 'label' );
    labelShortcutDisplayName.innerText = 'Display Name';
    divShortcutEditDisplayName.appendChild( labelShortcutDisplayName );
    var inputShortcutDisplayName = document.createElement( 'input' );
    inputShortcutDisplayName.setAttribute( 'type', 'text' );
    inputShortcutDisplayName.setAttribute( 'class', 'shortcutEditInput');
    inputShortcutDisplayName.setAttribute( 'id', 'shortcutEditInputDisplayName' + shortcutNextOrder );
    divShortcutEditDisplayName.appendChild( inputShortcutDisplayName );
    var divShortcutEditNumber = document.createElement( 'div' );
    divShortcutEditNumber.setAttribute( 'class', 'shortcutEditLine' )
    divShortcutEditBlock.appendChild( divShortcutEditNumber );
    var labelShortcutNumber = document.createElement( 'label' );
    labelShortcutNumber.innerText = 'Number';
    divShortcutEditNumber.appendChild( labelShortcutNumber );
    var inputShortcutNumber = document.createElement( 'input' );
    inputShortcutNumber.setAttribute( 'type', 'text' );
    inputShortcutNumber.setAttribute( 'class', 'shortcutEditInput');
    inputShortcutNumber.setAttribute( 'id', 'shortcutEditInputNumber' + shortcutNextOrder );
    divShortcutEditNumber.appendChild( inputShortcutNumber );
    var divShortcutEditAction = document.createElement( 'div' );
    divShortcutEditAction.setAttribute( 'class', 'shortcutEditLine' )
    divShortcutEditBlock.appendChild( divShortcutEditAction );
    var labelShortcutAction = document.createElement( 'label' );
    labelShortcutAction.innerText = 'Action';
    divShortcutEditAction.appendChild( labelShortcutAction );
    var inputShortcutAction = document.createElement( 'select' );
    inputShortcutAction.setAttribute( 'class', 'shortcutEditInput');
    inputShortcutAction.setAttribute( 'id', 'shortcutEditInputAction' + shortcutNextOrder );
    divShortcutEditAction.appendChild( inputShortcutAction );
    var optionAudio = document.createElement("option");
    optionAudio.text = "Audio";
    inputShortcutAction.add( optionAudio );
    var optionVideo = document.createElement("option");
    optionVideo.text = "Video";
    inputShortcutAction.add( optionVideo );
    var optionScreenshare = document.createElement("option");
    optionScreenshare.text = "Screenshare";
    inputShortcutAction.add( optionScreenshare );
    var optionChat = document.createElement("option");
    optionChat.text = "Chat";
    inputShortcutAction.add( optionChat );
    var optionDTMF = document.createElement("option");
    optionDTMF.text = "DTMF";
    inputShortcutAction.add( optionDTMF );
    var inputShortcutOrder = document.createElement( 'input' );
    inputShortcutOrder.setAttribute( 'type', 'hidden' );
    inputShortcutOrder.setAttribute( 'id', 'shortcutEditInputOrder' + shortcutNextOrder );
    divShortcutEditBlock.appendChild( inputShortcutOrder );
                    
    var shortcutEditSaveBtn = document.createElement('a');
    shortcutEditSaveBtn.setAttribute( 'class' , 'btn btn-primary btn-sm' );
    shortcutEditSaveBtn.setAttribute( 'id' , 'shortcutEditSave' + shortcutNextOrder );
    shortcutEditSaveBtn.setAttribute( 'href' , '#' );
    shortcutEditSaveBtn.setAttribute( 'onclick' , 'shortcutEditSave("' + shortcutNextOrder + '");' );
    shortcutEditSaveBtn.innerText = 'Save';
    divShortcutEditBlock.appendChild( shortcutEditSaveBtn );
}

// Activate a selected shortcut
async function shortcutRun( shortcutSelect ) {
    var shortcutsObj = ( JSON.parse( window.localStorage.getItem( 'org.doubango.shortcuts' ) ) );
console.log("shortcutRun - Debug 01 - shortcutsObj: ", shortcutsObj);
console.log("shortcutRun - Debug 02 - shortcutSelect: ", shortcutSelect);
    var shortcutNumber = shortcutsObj[ shortcutSelect ].number;
console.log("shortcutRun - Debug 03 - shortcutNumber: ", shortcutNumber);
    var shortcutAction = shortcutsObj[ shortcutSelect ].action;
console.log("shortcutRun - Debug 04 - shortcutAction: ", shortcutAction);
console.log("shortcutRun - Debug 05 - Wrote Input Field");
    window.localStorage.setItem( 'org.doubango.call.phone_number', shortcutNumber );
console.log("shortcutRun - Debug 06 - Set localstorage item");
    if ( shortcutAction == 'DTMF' ) {
console.log("shortcutRun - Debug 07 - This is a DTMF Shortcut");
        for (var i = 0; i < shortcutNumber.length; i++) {
console.log("shortcutRun - Debug 08 - Sending Key ", shortcutNumber.charAt(i) );
            sipSendDTMF( shortcutNumber.charAt(i) );
console.log("shortcutRun - Debug 09 - Sleeping for 200ms");
            await new Promise(r => setTimeout(r, 200));
        }
    } else {
        document.getElementById( 'txtPhoneNumber' ).value = shortcutNumber;
        if ( shortcutAction == 'Audio' ) {
console.log("shortcutRun - Debug 10 - Making Audio Call");
            sipCall("call-audio");
        } else if ( shortcutAction == 'Video' ) {
console.log("shortcutRun - Debug 11 - Making Video Call");
            sipCall("call-audiovideo");
        } else if ( shortcutAction == 'Screenshare' ) {
console.log("shortcutRun - Debug 12 - Making Screenshare Call");
            sipShareScreen();
        } else if ( shortcutAction == 'Chat' ) {
console.log("shortcutRun - Debug 13 - Making Chat");
            chatDisplay( shortcutNumber );
        } else {
            console.log( 'shortcutRun - Debug - Shortcut Action Not Recognized!!!' );
        }
    }
}

// Function to globally show/hide chat conversations
function uiShowHideChat( show ) {
    var msgDiv = document.getElementById( 'divChat' );
    var btnChatShowHide = document.getElementById( 'btnChatShowHide' );
    if ( show ) {
        msgDiv.style.display = 'block';
        msgDiv.classList.add( 'border-top-separator' );
        btnChatShowHide.value = 'Hide Chat';
        btnChatShowHide.setAttribute( 'onclick', 'uiShowHideChat( 0 )' );
        if ( btnChatShowHide.classList.contains( 'btnBlink' ) ) {
            btnChatShowHide.classList.remove( 'btnBlink' );
        }
    } else {
        msgDiv.style.display = 'none';
        msgDiv.classList.remove( 'border-top-separator' );
        window.localStorage.setItem( 'org.doubango.chat.activeConv', '' );
        btnChatShowHide.value = 'Show Chat';
        btnChatShowHide.setAttribute( 'onclick', 'uiShowHideChat( 1 )' );
    }
}

// Function to enumerate chat conversations from localstorage object
function chatEnum() {
    msgSession = ( "" == window.localStorage.getItem( 'org.doubango.chat.session' ) ? [] : JSON.parse( window.localStorage.getItem( 'org.doubango.chat.session' ) ) );
    var msgDiv = document.getElementById("divChat");
    var btnChatShowHide = document.getElementById( 'btnChatShowHide' );
    if ( msgSession.length == 0 ) {
        btnChatShowHide.disabled = true;
    } else {
        btnChatShowHide.disabled = false;
        var msgConvoListDiv = document.getElementById("chatList");
        msgConvoListDiv.innerHTML = "";
        var msgConvoHead = document.createElement('p');
        msgConvoHead.innerText = "Conversations";
        msgConvoListDiv.appendChild( msgConvoHead );
        msgSession.forEach( msgConversation => {
                var msgConvoEntry = document.createElement('div');
                msgConvoEntry.setAttribute( 'class', 'chatListEntry' );
                var msgConvoSel = document.createElement('a');
                msgConvoSel.setAttribute( 'class' , 'btn btn-primary btn-sm' );
                msgConvoSel.setAttribute( 'id' , 'convo' + msgConversation.contact );
                msgConvoSel.setAttribute( 'href' , '#' );
                msgConvoSel.setAttribute( 'onclick' , 'chatDisplay("' + msgConversation.contact + '");' );
                activeChat = window.localStorage.getItem('org.doubango.chat.activeConv');
                msgConvoSel.innerText = msgConversation.displayName;
                var msgConvoSelClose = document.createElement('a');
                msgConvoSelClose.setAttribute( 'class' , 'btn btn-primary btn-sm btn-chatClose' );
                msgConvoSelClose.setAttribute( 'id' , 'convo' + msgConversation.contact );
                msgConvoSelClose.setAttribute( 'href' , '#' );
                msgConvoSelClose.setAttribute( 'onclick' , 'chatCloseConvo("' + msgConversation.contact + '");' );
                msgConvoSelClose.innerText = 'X';
                msgConvoListDiv.appendChild( msgConvoEntry );
                msgConvoEntry.appendChild( msgConvoSel );
                msgConvoEntry.appendChild( msgConvoSelClose );
                if ( activeChat != msgConversation.contact && msgConversation.unread == 1 ) {
                    msgConvoSel.classList.add( 'btnBlink' );
                    //document.getElementById( 'convo' + msgConversation.contact ).classList.add( 'btnBlink' );
                } else if ( activeChat == msgConversation.contact ) {
                    if ( msgConvoSel.classList.contains( 'btnBlink' ) ) {
                    //if ( document.getElementById( 'convo' + msgConversation.contact ).classList.contains( 'btnBlink' ) ) {
                        msgConvoSel.classList.remove( 'btnBlink' );
                        //document.getElementById( 'convo' + msgConversation.contact ).classList.remove( 'btnBlink' );
                    }
                }
            }
        );
    }
}

// Function to display a chat interface from a selected conversation
function chatDisplay( msgFrom ) {
    if ( msgFrom != '' ) {
        uiShowHideChat( 1 );
        window.localStorage.setItem( 'org.doubango.chat.activeConv', msgFrom );
        msgSession = ( "" == window.localStorage.getItem( 'org.doubango.chat.session' ) ? [] : JSON.parse( window.localStorage.getItem( 'org.doubango.chat.session' ) ) );
        var chatConvDiv = document.getElementById( "chatConversation" );
        //chatConvDiv.innerHTML = "";

        // Draw the header with the contact name and the close button in the chat window
        if ( document.getElementById("chatConvoHeader") != null ) {
            chatConvHeader = document.getElementById("chatConvoHeader");
            chatConvHeader.innerHTML = "";
        } else {
            var chatConvHeader = document.createElement( 'div' );
            chatConvHeader.setAttribute( 'id' , 'chatConvoHeader' );
            chatConvDiv.appendChild( chatConvHeader );
        }
        var chatConvContact = document.createElement('p');
        chatConvContact.setAttribute( 'style' , 'test-align: center; width: 100%;' );
        chatConvHeader.appendChild( chatConvContact );

        // Draw the actual messages window
//        if ( JSON.stringify( msgSession ) !== '{}' ) {
            let msgConversation = msgSession.find( msgConversation => msgConversation.contact === msgFrom );
//        }
        if ( typeof msgConversation !== 'undefined' ) {
            // If a conversatione xists, prepare to display it
            messages = msgConversation.messages;
            //chatConvContact.innerText = msgConversation.contact;
            chatConvContact.innerText = msgConversation.displayName;
        } else {
            // If this is a new conversation, initiate it
            messages = [];
            let conversation = {
                "contact": msgFrom, 
                // In a new conversation we don't know the display name,
                //  so set it to the extension
                "displayName": msgFrom,
                "unread": 0,
                "messages": messages
            }
            msgSession.push(conversation);
            chatConvContact.innerText = msgFrom;
            var chatConvListDiv = document.getElementById("chatList");
            var chatConvSel = document.createElement('a');
            chatConvSel.setAttribute( 'class' , 'list-group-item list-group-item-action active' );
            chatConvSel.setAttribute( 'id' , 'convo' + msgFrom );
            chatConvSel.setAttribute( 'data-toggle' , 'list' );
            chatConvSel.setAttribute( 'href' , '#' );
            chatConvSel.setAttribute( 'onclick' , 'chatDisplay("' + msgFrom + '");' );
            chatConvSel.innerText = msgFrom;
            chatConvListDiv.appendChild( chatConvSel );
        }
        if ( document.getElementById("chatMessages") != null ) {
            chatMessagesDiv = document.getElementById("chatMessages");
            chatMessagesDiv.innerHTML = "";
        } else {
            var chatMessagesDiv = document.createElement('div');
            chatMessagesDiv.setAttribute( 'class' , 'overflow-auto' );
            chatMessagesDiv.setAttribute( 'id' , 'chatMessages' );
            chatConvDiv.appendChild( chatMessagesDiv );
        }
        messages.forEach( message => {
                var chatMsgLine = document.createElement('p');
                chatMsgLine.setAttribute( 'class' , 'msgLine' );
                if ( message.inOut == 1 ) {
                    chatMsgLine.setAttribute( 'style' , 'text-align: left;' );
                } else {
                    chatMsgLine.setAttribute( 'style' , 'text-align: right;' );
                }
                chatMsgLine.innerText = message.message;
                chatMessagesDiv.appendChild( chatMsgLine );
            }
        );
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
        var _listener = function(event) { 
            if (event.keyCode === 13) { 
                sipMsg( msgFrom ); 
            } 
        }
        // Draw the message input and send buttons at the bottom
        if ( document.getElementById("chatConvSend") != null ) {
            chatConvSend = document.getElementById("chatConvSend");
            chatInput = document.getElementById("chatInput");
            chatInput.value = '';
            // In order to reset the event listener so "send on enter" works
            //   we need to clone and replace the input element
            var new_chatInput = chatInput.cloneNode(true);
            chatConvSend.replaceChild( new_chatInput, chatInput );
            chatInput = document.getElementById("chatInput");
            chatSendBtn = document.getElementById("chatSendBtn");
        } else {
            var chatConvSend = document.createElement( 'div' );
            chatConvSend.setAttribute( 'id' , 'chatConvSend' );
            chatConvDiv.appendChild( chatConvSend );
            chatInput = document.createElement('input');
            chatInput.setAttribute( 'type', 'text' );
            chatInput.setAttribute( 'id', 'chatInput' );
            chatConvSend.appendChild( chatInput );
            var chatSendBtn = document.createElement('input');
            chatSendBtn.setAttribute( 'href' , '#' );
            chatSendBtn.setAttribute( 'type' , 'button' );
            chatSendBtn.setAttribute( 'id' , 'chatSendBtn' );
            chatSendBtn.setAttribute( 'class' , 'btn btn-primary btn-sm' );
            chatSendBtn.setAttribute( 'value' , 'Send' );
            chatConvSend.appendChild( chatSendBtn );
        }
        chatSendBtn.setAttribute( 'onClick' , 'sipMsg(\'' + msgFrom + '\')' );
        // Indicate these messages are now read
        for ( var i in msgSession ) {
            if (msgSession[i].contact == msgFrom) {
                msgSession[i].unread = 0;
                chatSave();
                break; //Stop this loop, we found it!
            }
        }
        window.localStorage.setItem('org.doubango.chat.session', JSON.stringify(msgSession));
        chatEnum();
        // Send chat when enter is pressed; 13 is enter key
        chatInput.addEventListener( "keyup", _listener );
        chatInput.focus();
    }
}

// Close and delete a chat conversation
function chatCloseConvo( msgFrom ) {
    msgSession = ( "" == window.localStorage.getItem( 'org.doubango.chat.session' ) ? [] : JSON.parse( window.localStorage.getItem( 'org.doubango.chat.session' ) ) );
console.log("chatCloseConvo - Debug 01");
    for ( var i in msgSession ) {
        if ( msgSession[i].contact == msgFrom ) {
            msgSession.splice( i , 1 );
            break; //Stop this loop, we found it!
        }
    }
console.log("chatCloseConvo - Debug 02");
    window.localStorage.setItem('org.doubango.chat.session', JSON.stringify(msgSession));
console.log("chatCloseConvo - Debug 03 - save");
    chatSave();
    if ( msgSession !== 'undefined' && msgSession.length >= 1 ) {
        chatDisplay( msgSession[0].contact );        
    } else {
        var chatConvListDiv = document.getElementById("chatList");
        chatConvListDiv.innerHTML = "";
        var chatConvDiv = document.getElementById( "chatConversation" );
        chatConvDiv.innerHTML = "";
        uiShowHideChat( 0 );
    }
    chatEnum();
}

// Write chats to the DB if that's configured for session persistence
function chatSave() {
    $.ajax({
        url: 'includes/saveChat.php',
        type: 'POST',
        data: {
            extension:window.localStorage.getItem( 'org.doubango.identity.impi' ),
            messages:window.localStorage.getItem( 'org.doubango.chat.session' )
        },
        success: function(data) {
            console.log(data); // Inspect this in your console
        }
    });
}

// Function to send an sms message
function sipMsg( msgFrom ) {
    if ( oSipStack ) {
        // create call session
        msgTimeStamp = Date.now();
        oSipSessionMsg = oSipStack.newSession( 'message' );
        var msgMessage = chatInput.value;
        oSipSessionMsg.send( msgFrom , msgMessage , 'text/plain;charset=utf-8');
        msgSession = ( "" == window.localStorage.getItem( 'org.doubango.chat.session' ) ? [] : JSON.parse( window.localStorage.getItem( 'org.doubango.chat.session' ) ) );
        let msgConversation = msgSession.find( msgConversation => msgConversation.contact === msgFrom );
        let message = {
            "inOut": 0,
            "timestamp": msgTimeStamp,
            "message": msgMessage
        }
        if ( typeof msgConversation !== 'undefined' ) {
            // A conversation exists with this user, add to it
            msgConversation.messages.push(message);
            for ( var i in msgSession ) {
                if (msgSession[i].contact == msgFrom) {
                    msgSession[i].messages = msgConversation.messages;
                    break; //Stop this loop, we found it!
                }
            }
        } else {
            // This is a new conversation
            messages = [];
            messages.push(message);
            let conversation = {
                "contact": msgFrom,
                // In a new conversation we don't know the display name,
                //  so set it to the extension
                "displayName": msgFrom,
                "unread": 0,
                "messages": messages
            }
            msgSession.push(conversation);
        }
        window.localStorage.setItem('org.doubango.chat.session', JSON.stringify(msgSession));
        chatSave();
        chatDisplay( msgFrom );
    }
}

function loadCallOptions() {
    if (window.localStorage) {
        var s_value;
        if ((s_value = window.localStorage.getItem('org.doubango.call.phone_number'))) txtPhoneNumber.value = s_value;
        bDisableVideo = (window.localStorage.getItem('org.doubango.expert.disable_video') == "true");
        txtCallStatus.innerHTML = '<i>Video ' + (bDisableVideo ? 'disabled' : 'enabled') + '</i>';
    }
}

function saveCallOptions() {
    if (window.localStorage) {
        window.localStorage.setItem('org.doubango.call.phone_number', txtPhoneNumber.value);
        window.localStorage.setItem('org.doubango.expert.disable_video', bDisableVideo ? "true" : "false");
    }
}

function loadCredentials() {
    if (window.localStorage) {
        // IE retuns 'null' if not defined
        var s_value;
        if ((s_value = window.localStorage.getItem('org.doubango.identity.display_name'))) txtDisplayName.value = s_value;
        if ((s_value = window.localStorage.getItem('org.doubango.identity.impi'))) txtPrivateIdentity.value = s_value;
        if ((s_value = window.localStorage.getItem('org.doubango.identity.impu'))) txtPublicIdentity.value = s_value;
        if ((s_value = window.localStorage.getItem('org.doubango.identity.password'))) txtPassword.value = s_value;
        // 2020.12.10 - Edit by jgullo - Removed as it's set from the global config
        //if ((s_value = window.localStorage.getItem('org.doubango.identity.realm'))) txtRealm.value = s_value;
    }
    else {
        //txtDisplayName.value = "005";
        //txtPrivateIdentity.value = "005";
        //txtPublicIdentity.value = "sip:005@sip2sip.info";
        //txtPassword.value = "005";
        //txtRealm.value = "sip2sip.info";
        //txtPhoneNumber.value = "701020";
    }
};

function saveCredentials() {
    if (window.localStorage) {
        window.localStorage.setItem('org.doubango.identity.display_name', txtDisplayName.value);
        window.localStorage.setItem('org.doubango.identity.impi', txtPrivateIdentity.value);
        window.localStorage.setItem('org.doubango.identity.impu', txtPublicIdentity.value);
        window.localStorage.setItem('org.doubango.identity.password', txtPassword.value);
        // 2020.12.10 - Edit by jgullo - Removed as it's set from the global config
        //window.localStorage.setItem('org.doubango.identity.realm', txtRealm.value);
    }
};

// sends SIP REGISTER request to login
function sipRegister() {
    // catch exception for IE (DOM not ready)
    try {
        btnRegister.disabled = true;
        // 2020.12.10 - Edit by jgullo - Removed check for txtRealm as it's set by config
        //if (!txtRealm.value || !txtPrivateIdentity.value || !txtPublicIdentity.value) {
        if ( !txtPrivateIdentity.value || !txtPublicIdentity.value) {
            txtRegStatus.innerHTML = '<img src="images/reg-status-disconnected.png" height="24" /><b>Please fill madatory fields (*)</b>';
            btnRegister.disabled = false;
            return;
        }
        var o_impu = tsip_uri.prototype.Parse(txtPublicIdentity.value);
        if (!o_impu || !o_impu.s_user_name || !o_impu.s_host) {
            txtRegStatus.innerHTML = '<img src="images/reg-status-disconnected.png" height="24" /><b>[" + txtPublicIdentity.value + "] is not a valid Public identity</b>';
            btnRegister.disabled = false;
            return;
        }

        // enable notifications if not already done
        if (window.webkitNotifications && window.webkitNotifications.checkPermission() != 0) {
            window.webkitNotifications.requestPermission();
        }
        // 2021.01.20 - Edit by jgullo - Adding initialization for chat array variable.
        let msgSession = [];
        if ( window.localStorage ) {
            if ( localStorage.getItem( 'org.doubango.chat.session' ) === null ) {
                window.localStorage.setItem( 'org.doubango.chat.session', JSON.stringify( msgSession ) );
            }
        }

        // save credentials
        saveCredentials();

        // update debug level to be sure new values will be used if the user haven't updated the page
        SIPml.setDebugLevel((window.localStorage && window.localStorage.getItem('org.doubango.expert.disable_debug') == "true") ? "error" : "info");

        // create SIP stack
console.log("sipRegister - Debug 01 - window.localStorage: ", window.localStorage);
        oSipStack = new SIPml.Stack({
            // 2020.12.10 - Edit by jgullo - Edited to pull the value from the config and not from the form
            realm: (window.localStorage ? window.localStorage.getItem('org.doubango.identity.realm') : null),
            //realm: txtRealm.value,
            impi: txtPrivateIdentity.value,
            impu: txtPublicIdentity.value,
            password: txtPassword.value,
            display_name: txtDisplayName.value,
            websocket_proxy_url: (window.localStorage ? window.localStorage.getItem('org.doubango.expert.websocket_server_url') : null),
            outbound_proxy_url: (window.localStorage ? window.localStorage.getItem('org.doubango.expert.sip_outboundproxy_url') : null),
            ice_servers: (window.localStorage ? window.localStorage.getItem('org.doubango.expert.ice_servers') : null),
            enable_rtcweb_breaker: (window.localStorage ? window.localStorage.getItem('org.doubango.expert.enable_rtcweb_breaker') == "true" : false),
            events_listener: { events: '*', listener: onSipEventStack },
            enable_early_ims: (window.localStorage ? window.localStorage.getItem('org.doubango.expert.disable_early_ims') != "true" : true), // Must be true unless you're using a real IMS network
            enable_media_stream_cache: (window.localStorage ? window.localStorage.getItem('org.doubango.expert.enable_media_caching') == "true" : false),
            bandwidth: (window.localStorage ? tsk_string_to_object(window.localStorage.getItem('org.doubango.expert.bandwidth')) : null), // could be redefined a session-level
            video_size: (window.localStorage ? tsk_string_to_object(window.localStorage.getItem('org.doubango.expert.video_size')) : null), // could be redefined a session-level
            sip_headers: [
                { name: 'User-Agent', value: 'IM-client/OMA1.0 sipML5-ng-L1KMakes-v1.2021.02' },
                { name: 'Organization', value: 'Doubango Telecom, Cloudonix, SEIU Local 1000' }
            ]
        }
        );
        if (oSipStack.start() != 0) {
            txtRegStatus.innerHTML = '<img src="images/reg-status-disconnected.png" height="24" /><b>Failed to start the SIP stack</b>';
        }
        else  {
            // Hide the side-oabel upon registration
            $(".screen-overlay").removeClass("show");
            $(".offcanvas").removeClass("show");
            $("body").removeClass("offcanvas-active");
console.log("sipRegister - Debug 02 - window.localStorage.getItem( 'org.doubango.shortcuts' ): ", window.localStorage.getItem( 'org.doubango.shortcuts' ));
            shortcutsObj = ( JSON.parse( window.localStorage.getItem( 'org.doubango.shortcuts' ) ) );
            shortcutEnum();
            // If there are chats stored in the local session, load them
            chatEnum();
            msgSession = ( "" == window.localStorage.getItem( 'org.doubango.chat.session' ) ? [] : JSON.parse( window.localStorage.getItem( 'org.doubango.chat.session' ) ) );
            var btnChatShowHide = document.getElementById( 'btnChatShowHide' );
            if ( msgSession.length == 0 ) {
                uiShowHideChat( 0 );
                btnChatShowHide.disabled = true;
            } else {
                uiShowHideChat( 1 );
                btnChatShowHide.disabled = false;
            }
            return;
        }
    }
    catch (e) {
        txtRegStatus.innerHTML = '<img src="images/reg-status-disconnected.png" height="24" /><b>2:' + e + '</b>';
    }
    btnRegister.disabled = false;
}

// sends SIP REGISTER (expires=0) to logout
function sipUnRegister() {
    if (oSipStack) {
        oSipStack.stop(); // shutdown all sessions
    }
}

// makes a call (SIP INVITE)
function sipCall(s_type) {
    // If a video or screen share call is starting, draw the video UI
console.log("sipCall Debug 01 ");
    if ( s_type == 'call-audiovideo' || s_type == 'call-screenshare' ) {
console.log("sipCall Debug 02 - Video or Screencast Call ");
//        if ( s_type == 'call-audiovideo' ) {
        if ( s_type == 'call-audiovideo' || s_type == 'call-screenshare' ) {
console.log("sipCall Debug 03 - Video Call ");
            // Video call, so show remote video, show local video, hide local screenshare
            uiVideoElementDraw( 1, 1 );
//        } else if ( s_type == 'call-screenshare' ) {
console.log("sipCall Debug 04 - Screencast Call ");
            // Screencast call, so show remote video, hide local video, show local screenshare
//            uiVideoElementDraw( 1, 0 );
        }

console.log("sipCall Debug 05: ", oConfigCall );
        if (window.localStorage) {
            oConfigCall.bandwidth = tsk_string_to_object(window.localStorage.getItem('org.doubango.expert.bandwidth')); // already defined at stack-level but redifined to use latest values
            oConfigCall.video_size = tsk_string_to_object(window.localStorage.getItem('org.doubango.expert.video_size')); // already defined at stack-level but redifined to use latest values
        }

console.log("sipCall Debug 06: ", oConfigCall );
        videoLocal = document.getElementById("video_local");
        videoRemote = document.getElementById("video_remote");
        oConfigCall.video_local = document.getElementById("video_local");
        oConfigCall.video_remote = document.getElementById("video_remote");
    }
    if (oSipStack && !oSipSessionCall && !tsk_string_is_null_or_empty(txtPhoneNumber.value)) {
console.log("sipCall Debug 07 - Make a Call to ", txtPhoneNumber.value );
        if (s_type == 'call-screenshare') {
            if (!SIPml.isScreenShareSupported()) {
                alert('Screen sharing not supported. Are you using chrome 26+?');
                return;
            }
            if (!location.protocol.match('https')) {
                if (confirm("Screen sharing requires https://. Do you want to be redirected?")) {
                    sipUnRegister();
                    window.location = 'https://localhost/index.php';
                }
                return;
            }
        }
        //btnCall.disabled = true;
        btnAudio.disabled = true;
        btnVideo.disabled = true;
        btnScreenShare.disabled = true;
        btnHangUp.disabled = false;

console.log("sipCall Debug 07.5 - window.localStorage: ", window.localStorage);

console.log("sipCall Debug 08 - Create Call Session" );
        // create call session
        oSipSessionCall = oSipStack.newSession(s_type, oConfigCall);
        // make call
        if (oSipSessionCall.call(txtPhoneNumber.value) != 0) {
console.log("sipCall Debug 09 - Number is Blank" );
            oSipSessionCall = null;
            txtCallStatus.value = 'Failed to make call';
            //btnCall.disabled = false;
            btnAudio.disabled = false;
            btnVideo.disabled = false;
            btnScreenShare.disabled = false;
            btnChat.disabled = false;
            btnHangUp.disabled = true;
            return;
        }
console.log("sipCall Debug 10 - Save Call Session" );
        saveCallOptions();
    }
    else if (oSipSessionCall) {
        // Answer an incoming call
console.log("sipCall Debug 11 - Answer a Call" );
        txtCallStatus.innerHTML = '<i>Connecting...</i>';
        if ( btnAudio.classList.contains( 'btnBlink' ) ) {
            btnAudio.classList.remove( 'btnBlink' );
        }
        if ( btnVideo.classList.contains( 'btnBlink' ) ) {
            btnVideo.classList.remove( 'btnBlink' );
        }
console.log("sipCall Debug 12 - Accept the call" );
        oSipSessionCall.accept(oConfigCall);
    }
}

// Share entire desktop aor application using BFCP or WebRTC native implementation
function sipShareScreen() {
console.log( "sipShareScreen - Debug 00" );
    if (SIPml.getWebRtcType() === 'w4a') {
console.log( "sipShareScreen - Debug 01 ", SIPml.getWebRtcType() );
    // Sharing using BFCP -> requires an active session
        if (!oSipSessionCall) {
console.log( "sipShareScreen - Debug 02 - There is no active session" );
            txtCallStatus.innerHTML = '<i>No active session</i>';
            return;
        }
        if (oSipSessionCall.bfcpSharing) {
console.log( "sipShareScreen - Debug 03 - bfcpSharing", oSipSessionCall.bfcpSharing );
            if (oSipSessionCall.stopBfcpShare(oConfigCall) != 0) {
console.log( "sipShareScreen - Debug 04 - Failed to stop BFCP Share" );
                txtCallStatus.value = 'Failed to stop BFCP share';
            }
            else {
console.log( "sipShareScreen - Debug 05 - set bfcp sharing to false" );
                oSipSessionCall.bfcpSharing = false;
            }
        }
        else {
console.log( "sipShareScreen - Debug 06 - Not BFCPSharing ", oSipSessionCall.bfcpSharing );
            oConfigCall.screencast_window_id = 0x00000000;
console.log( "sipShareScreen - Debug 07 - Set screencast window ID" );
            if (oSipSessionCall.startBfcpShare(oConfigCall) != 0) {
console.log( "sipShareScreen - Debug 08 - Failed to start bfcp share" );
                txtCallStatus.value = 'Failed to start BFCP share';
            }
            else {
console.log( "sipShareScreen - Debug 09 - set bfcpsharing to true" );
                oSipSessionCall.bfcpSharing = true;
            }
console.log( "sipShareScreen - Debug 10" );
        }
    }
    else {
console.log( "sipShareScreen - Debug 11 - Invoke sipCall" );
        sipCall('call-screenshare');
console.log( "sipShareScreen - Debug 12 - After sipCall" );
    }
}

// transfers the call
function sipTransfer() {
    if (oSipSessionCall) {
        var s_destination = prompt('Enter destination number', '');
        if (!tsk_string_is_null_or_empty(s_destination)) {
            btnTransfer.disabled = true;
            if (oSipSessionCall.transfer(s_destination) != 0) {
                txtCallStatus.innerHTML = '<i>Call transfer failed</i>';
                btnTransfer.disabled = false;
                return;
            }
            txtCallStatus.innerHTML = '<i>Transfering the call...</i>';
        }
    }
}

// holds or resumes the call
function sipToggleHoldResume() {
    if (oSipSessionCall) {
        var i_ret;
        btnHoldResume.disabled = true;
        txtCallStatus.innerHTML = oSipSessionCall.bHeld ? '<i>Resuming the call...</i>' : '<i>Holding the call...</i>';
        i_ret = oSipSessionCall.bHeld ? oSipSessionCall.resume() : oSipSessionCall.hold();
        if (i_ret != 0) {
            txtCallStatus.innerHTML = '<i>Hold / Resume failed</i>';
            btnHoldResume.disabled = false;
            return;
        }
    }
}

// Mute or Unmute the call
function sipToggleMute() {
    if (oSipSessionCall) {
        var i_ret;
        var bMute = !oSipSessionCall.bMute;
        txtCallStatus.innerHTML = bMute ? '<i>Mute the call...</i>' : '<i>Unmute the call...</i>';
        i_ret = oSipSessionCall.mute('audio'/*could be 'video'*/, bMute);
        if (i_ret != 0) {
            txtCallStatus.innerHTML = '<i>Mute / Unmute failed</i>';
            return;
        }
        oSipSessionCall.bMute = bMute;
        btnMute.value = bMute ? "Unmute" : "Mute";
    }
}

// terminates the call (SIP BYE or CANCEL)
function sipHangUp() {
    if (oSipSessionCall) {
        txtCallStatus.innerHTML = '<i>Terminating the call...</i>';
        oSipSessionCall.hangup({ events_listener: { events: '*', listener: onSipEventSession } });
    }
}

function sipSendDTMF(c) {
    if (oSipSessionCall && c) {
        if (oSipSessionCall.dtmf(c) == 0) {
            try { dtmfTone.play(); } catch (e) { }
        }
    }
}

function startRingTone() {
    try { ringtone.play(); }
    catch (e) { }
}

function stopRingTone() {
    try { ringtone.pause(); }
    catch (e) { }
}

function startRingbackTone() {
    try { ringbacktone.play(); }
    catch (e) { }
}

function stopRingbackTone() {
    try { ringbacktone.pause(); }
    catch (e) { }
}

function toggleFullScreen() {
    if (videoRemote.webkitSupportsFullscreen) {
        fullScreen(!videoRemote.webkitDisplayingFullscreen);
    }
    else {
        fullScreen(!bFullScreen);
    }
}

function openKeyPad() {
    divKeyPad.style.visibility = 'visible';
    divKeyPad.style.left = ((document.body.clientWidth - C.divKeyPadWidth) >> 1) + 'px';
    divKeyPad.style.top = '70px';
    divGlassPanel.style.visibility = 'visible';
}

function closeKeyPad() {
    divKeyPad.style.left = '0px';
    divKeyPad.style.top = '0px';
    divKeyPad.style.visibility = 'hidden';
    divGlassPanel.style.visibility = 'hidden';
}

function fullScreen(b_fs) {
    bFullScreen = b_fs;
    if (tsk_utils_have_webrtc4native() && bFullScreen && videoRemote.webkitSupportsFullscreen) {
        if (bFullScreen) {
            videoRemote.webkitEnterFullScreen();
        }
        else {
            videoRemote.webkitExitFullscreen();
        }
    }
    else {
        if (tsk_utils_have_webrtc4npapi()) {
            try { if (window.__o_display_remote) window.__o_display_remote.setFullScreen(b_fs); }
            catch (e) { divVideo.setAttribute("class", b_fs ? "full-screen" : "normal-screen"); }
        }
        else {
            divVideo.setAttribute("class", b_fs ? "full-screen" : "normal-screen");
        }
    }
}

function showNotifICall(s_number) {
    // permission already asked when we registered
    if (window.webkitNotifications && window.webkitNotifications.checkPermission() == 0) {
        if (oNotifICall) {
            oNotifICall.cancel();
        }
        oNotifICall = window.webkitNotifications.createNotification('images/sipml-34x39.png', 'Incaming call', 'Incoming call from ' + s_number);
        oNotifICall.onclose = function () { oNotifICall = null; };
        oNotifICall.show();
    }
}

function onKeyUp(evt) {
    evt = (evt || window.event);
    if (evt.keyCode == 27) {
        fullScreen(false);
    }
    else if (evt.ctrlKey && evt.shiftKey) { // CTRL + SHIFT
        if (evt.keyCode == 65 || evt.keyCode == 86) { // A (65) or V (86)
            bDisableVideo = (evt.keyCode == 65);
            txtCallStatus.innerHTML = '<i>Video ' + (bDisableVideo ? 'disabled' : 'enabled') + '</i>';
            window.localStorage.setItem('org.doubango.expert.disable_video', bDisableVideo);
        }
    }
}

function onDivCallCtrlMouseMove(evt) {
    try { // IE: DOM not ready
        if (tsk_utils_have_stream()) {
            //btnCall.disabled = (!tsk_utils_have_stream() || !oSipSessionRegister || !oSipSessionRegister.is_connected());
            btnAudio.disabled = (!tsk_utils_have_stream() || !oSipSessionRegister || !oSipSessionRegister.is_connected());
            btnVideo.disabled = (!tsk_utils_have_stream() || !oSipSessionRegister || !oSipSessionRegister.is_connected());
            btnScreenShare.disabled = (!tsk_utils_have_stream() || !oSipSessionRegister || !oSipSessionRegister.is_connected());
            btnChat.disabled = (!tsk_utils_have_stream() || !oSipSessionRegister || !oSipSessionRegister.is_connected());
            document.getElementById("divCallCtrl").onmousemove = null; // unsubscribe
        }
    }
    catch (e) { }
}

function uiOnConnectionEvent(b_connected, b_connecting) { // should be enum: connecting, connected, terminating, terminated
    btnRegister.disabled = b_connected || b_connecting;
    btnUnRegister.disabled = !b_connected && !b_connecting;
    //btnCall.disabled = !(b_connected && tsk_utils_have_webrtc() && tsk_utils_have_stream());
    btnAudio.disabled = !(b_connected && tsk_utils_have_webrtc() && tsk_utils_have_stream());
    btnVideo.disabled = !(b_connected && tsk_utils_have_webrtc() && tsk_utils_have_stream());
    btnScreenShare.disabled = !(b_connected && tsk_utils_have_webrtc() && tsk_utils_have_stream());
    btnChat.disabled = !(b_connected && tsk_utils_have_webrtc() && tsk_utils_have_stream());
    btnHangUp.disabled = !oSipSessionCall;
}

// 3 Params to draw the video elements:
//  rv_show - Remote Video show flag, 0=hide, 1=show, 2=no change
//  lvv_show - Loval Video Camera show flag, 0=hide, 1=show, 2=no change
//  lvs_show - Local Screencast show flag, 0=hide, 1=show, 2=no change
function uiVideoElementDraw( rv_show, lv_show ) {
console.log("Debug uiVideoElementDraw 01 ", rv_show, " ", lv_show );
    var divCallWrapper = document.getElementById( 'divCallWrapper' );
    var divVideo = document.getElementById( 'divVideo' );
    var divVideoRemoteWrapper = document.getElementById( 'divVideoRemoteWrapper' );
    var divVideoLocalWrapper = document.getElementById( 'divVideoLocalWrapper' );
    //var divLocalVideoWrapper = document.getElementById( 'divLocalVideoWrapper' );
    //var divLocalScreencastWrapper = document.getElementById( 'divLocalScreencastWrapper' );
    if ( rv_show == 0 && lv_show == 0 ) {
        // If we're hiding everything, clear the 3 divs and set the parent div to 0 height
console.log("Debug uiVideoElementDraw 02 - Hide All Video");
        divCallWrapper.classList.remove( 'border-top-separator' );
        divVideoRemoteWrapper.innerHTML = '';
        divVideoLocalWrapper.innerHTML = '';
        divVideo.style.height = '0px';
        btnFullScreen.disabled = true;
    } else {
console.log("Debug uiVideoElementDraw 03 - Draw Some Video");

        divCallWrapper.classList.add( 'border-top-separator' );
        divVideo.style.minheight = '340px';
console.log("Debug uiVideoElementDraw 04 - Remote Video");
        if ( rv_show == 1 ) {
console.log("Debug uiVideoElementDraw 05 - Draw Remote Video");
            // Draw elements for Remote Video
            var videoRemoteElement = document.getElementById( 'video_remote' );
console.log("Debug uiVideoElementDraw 06 - Check if remote video is drawn ", videoRemoteElement );
            if ( videoRemoteElement == null ) {
console.log("Debug uiVideoElementDraw 07 - Remote Video isn't Drawn, draw it" );
                var videoRemoteElement = document.createElement('video');
                videoRemoteElement.setAttribute( 'id', 'video_remote' );
                videoRemoteElement.setAttribute( 'class', 'video col-xl-6 col-lg-6 col-md-12 col-sm-12' );
                videoRemoteElement.setAttribute( 'width', '100%' );
                videoRemoteElement.setAttribute( 'height', '100%' );
                videoRemoteElement.setAttribute( 'autoplay', 'autoplay' );
                divVideoRemoteWrapper.appendChild( videoRemoteElement );
                btnFullScreen.disabled = false;
            }
        } else if ( rv_show == 0 ) {
console.log("Debug uiVideoElementDraw 08 - Hide Remote Video");
            // Hide elements for Remote Video
            divVideoRemoteWrapper.innerHTML = '';
            btnFullScreen.disabled = true;
        }

console.log("Debug uiVideoElementDraw 12 - Local Video");
        if ( lv_show == 1 ) {
console.log("Debug uiVideoElementDraw 13 - Show Local Camera Video");
            // Draw elements for Local Camera Video
            var divVideoLocal = document.getElementById( 'divVideoLocal' );
console.log("Debug uiVideoElementDraw 14 - Check if local camera is drawn ", divVideoLocalWrapper );
            if ( divVideoLocal == null ) {
console.log("Debug uiVideoElementDraw 15 - Local Camera isn't drawn, draw it");
                // We're drawing local video so clear the wrapper div
                var divVideoLocal = document.createElement('div');
                divVideoLocal.setAttribute( 'id', 'divVideoLocal' );
                divVideoLocal.setAttribute( 'class', 'previewvideo' );
                divVideoLocalWrapper.appendChild( divVideoLocal );
                var videoLocalElement = document.createElement('video');
                videoLocalElement.setAttribute( 'id', 'video_local' );
                videoLocalElement.setAttribute( 'class', 'video' );
                videoLocalElement.setAttribute( 'width', '100%' );
                videoLocalElement.setAttribute( 'height', '100%' );
                videoLocalElement.setAttribute( 'autoplay', 'autoplay' );
                videoLocalElement.setAttribute( 'muted', 'true' );
                divVideoLocal.appendChild( videoLocalElement );
                videoLocalElement.muted = 'true';
            }
        }

        if ( lv_show == 0 ) {
            // Hide Local Video
            divVideoLocalWrapper.innerHTML = '';
        }
    }
console.log("Debug uiVideoElementDraw 20 - End Function");
}

function uiDisableCallOptions() {
    if (window.localStorage) {
        window.localStorage.setItem('org.doubango.expert.disable_callbtn_options', 'true');
        uiBtnCallSetText('Call');
        alert('Use expert view to enable the options again (/!\\requires re-loading the page)');
    }
}

function uiBtnCallSetText(s_text) {
    switch (s_text) {
        case "Call":
            {
                var bDisableCallBtnOptions = (window.localStorage && window.localStorage.getItem('org.doubango.expert.disable_callbtn_options') == "true");
                ulCallOptions.style.visibility = bDisableCallBtnOptions ? "hidden" : "visible";
                if (!bDisableCallBtnOptions && ulCallOptions.parentNode != divBtnCallGroup) {
                    divBtnCallGroup.appendChild(ulCallOptions);
                }
                else if (bDisableCallBtnOptions && ulCallOptions.parentNode == divBtnCallGroup) {
                    document.body.appendChild(ulCallOptions);
                }

                break;
            }
        default:
            {
                ulCallOptions.style.visibility = "hidden";
                if (ulCallOptions.parentNode == divBtnCallGroup) {
                    document.body.appendChild(ulCallOptions);
                }
                break;
            }
    }
}

function uiCallTerminated(s_description) {
    uiBtnCallSetText("Call");
    btnHangUp.value = 'HangUp';
    btnHoldResume.value = 'hold';
    btnMute.value = "Mute";
    //btnCall.disabled = false;
    btnAudio.disabled = false;
    btnVideo.disabled = false;
    btnScreenShare.disabled = false;
    btnChat.disabled = false;
    btnHangUp.disabled = true;
    if (window.btnBFCP) window.btnBFCP.disabled = true;

    oSipSessionCall = null;

    stopRingbackTone();
    stopRingTone();

    txtCallStatus.innerHTML = "<i>" + s_description + "</i>";
    // Hide the video element
    uiVideoElementDraw( 0, 0 );
    // 2021.01.13 Edit by jgullo - Rather than doing this with opacity, hide it
    //divCallOptions.style.borderTop = 'none';
    divCallWrapper.classList.remove( 'border-top-separator' );
    divCallOptions.style.display = 'none';

    if (oNotifICall) {
        oNotifICall.cancel();
        oNotifICall = null;
    }

    //uiVideoDisplayEvent(false, false);
    //uiVideoDisplayEvent(true, false);

    setTimeout(function () { if (!oSipSessionCall) txtCallStatus.innerHTML = ''; }, 2500);
}

// Callback function for SIP Stacks
function onSipEventStack(e /*SIPml.Stack.Event*/) {
console.log("onSipEventStack - Debug 00 - ", e);
    tsk_utils_log_info('==stack event = ' + e.type);
    switch (e.type) {
        case 'started':
            {
console.log("onSipEventStack - started - Debug 01");
                // catch exception for IE (DOM not ready)
                try {
                    // LogIn (REGISTER) as soon as the stack finish starting
                    oSipSessionRegister = this.newSession('register', {
                    expires: 200,
                    events_listener: { events: '*', listener: onSipEventSession },
                    sip_caps: [
                        { name: '+g.oma.sip-im', value: null },
                        //{ name: '+sip.ice' }, // rfc5768: FIXME doesn't work with Polycom TelePresence
                        { name: '+audio', value: null },
                        { name: 'language', value: '\"en,fr\"' }
                    ]
                    });
                    oSipSessionRegister.register();
                }
                catch (e) {
                    txtRegStatus.value = txtRegStatus.innerHTML = '<img src="images/reg-status-disconnected.png" height="24" /><b>1:' + e + '</b>';
                    btnRegister.disabled = false;
                }
                break;
                }
        case 'stopping': case 'stopped': case 'failed_to_start': case 'failed_to_stop':
            {
console.log("onSipEventStack - stopping, stopped, failed_to_start, failed_to_stop - Debug 01", e.type);
                var bFailure = (e.type == 'failed_to_start') || (e.type == 'failed_to_stop');
                oSipStack = null;
                oSipSessionRegister = null;
                oSipSessionCall = null;

                uiOnConnectionEvent(false, false);

                stopRingbackTone();
                stopRingTone();

                uiVideoElementDraw( 0, 0 );
                // 2021.01.13 Edit by jgullo - Rather than doing this with opacity, hide it
                divCallWrapper.classList.remove( 'border-top-separator' );
                //divCallOptions.style.borderTop = 'none';
                divCallOptions.style.display = 'none';

                txtCallStatus.innerHTML = '';
                txtRegStatus.innerHTML = bFailure ? '<img src="images/reg-status-disconnected.png" height="24" /><i>Disconnected: <b>' + e.description + '</b></i>' : '<img src="images/reg-status-disconnected.png" height="24" /><i>Disconnected</i>';
                break;
            }

        case 'i_new_call':
            {
console.log("onSipEventStack - i_new_call - Debug 01");
                if (oSipSessionCall) {
                    // do not accept the incoming call if we're already 'in call'
                    e.newSession.hangup(); // comment this line for multi-line support
                }
                else {
                    oSipSessionCall = e.newSession;
                    // start listening for events
                    oSipSessionCall.setConfiguration(oConfigCall);

                    uiBtnCallSetText('Answer');
                    btnHangUp.value = 'Reject';
                    //btnCall.disabled = false;
                    btnAudio.disabled = false;
                    btnAudio.classList.add( 'btnBlink' );
                    btnVideo.disabled = false;
                    btnVideo.classList.add( 'btnBlink' );
                    btnScreenShare.disabled = false;
                    btnChat.disabled = false;
                    btnHangUp.disabled = false;

                    startRingTone();

                    var sRemoteNumber = (oSipSessionCall.getRemoteFriendlyName() || 'unknown');
                    txtCallStatus.innerHTML = "<i>Incoming call from [<b>" + sRemoteNumber + "</b>]</i>";
                    showNotifICall(sRemoteNumber);
                }
                break;
            }

        case 'm_permission_requested':
            {
console.log("onSipEventStack - m_permission_requested - Debug 01");
                divGlassPanel.style.visibility = 'visible';
                break;
            }
        case 'm_permission_accepted':
        case 'm_permission_refused':
            {
console.log("onSipEventStack - m_permission_accepted, m_permission_refused - Debug 01 ", e.type );
                divGlassPanel.style.visibility = 'hidden';
                if (e.type == 'm_permission_refused') {
                    if ( btnAudio.classList.contains( 'btnBlink' ) ) {
                        btnAudio.classList.remove( 'btnBlink' );
                    }
                    if ( btnVideo.classList.contains( 'btnBlink' ) ) {
                        btnVideo.classList.remove( 'btnBlink' );
                    }
                    uiCallTerminated('Media stream permission denied');
                }
                break;
            }
        case 'i_new_message':
            {
console.log("onSipEventStack - i_new_message - Debug 01: ", e);
                //msgFrom = e.o_event.o_message.o_hdr_From.s_display_name;
                activeChat = window.localStorage.getItem( 'org.doubango.chat.activeConv' );
                msgFrom = e.o_event.o_message.o_hdr_From.o_uri.s_user_name;
                msgFromDisplay = e.o_event.o_message.o_hdr_From.s_display_name;
                msgTimeStamp = Date.now();
                msgTimeDate = new Date(msgTimeStamp);
                msgTimeString = msgTimeDate.toLocaleString()
                msgMessage = e.getContentString();
                msgSession = ( "" == window.localStorage.getItem( 'org.doubango.chat.session' ) ? [] : JSON.parse( window.localStorage.getItem( 'org.doubango.chat.session' ) ) );
                let msgConversation = msgSession.find( msgConversation => msgConversation.contact === msgFrom );
                let message = {
                    "inOut": 1,
                    "timestamp": msgTimeStamp,
                    "message": msgMessage
                }
                if ( typeof msgConversation !== 'undefined' ) {
                    // A conversation exists with this user, add to it
                    msgConversation.messages.push(message);
                    for ( var i in msgSession ) {
                        if (msgSession[i].contact == msgFrom) {
                            // Trigger the unread indicator in an inactive chat
                            if ( activeChat != msgFrom ) {
                                msgSession[i].unread = 1;
                            }
                            if ( msgSession[i].displayName != msgFromDisplay ) {
                                msgSession[i].displayName = msgFromDisplay;
                            }
                            msgSession[i].messages = msgConversation.messages;
                            break; //Stop this loop, we found it!
                        }
                    }
                } else {
                    // This is a new conversation
                    messages = [];
                    messages.push(message);
                    let conversation = {
                        "contact": msgFrom,
                        "displayName": msgFromDisplay,
                        "unread": 0,
                        "messages": messages
                    }
                    msgSession.push(conversation);
                }
                window.localStorage.setItem('org.doubango.chat.session', JSON.stringify(msgSession));    
                var msgDiv = document.getElementById( 'divChat' );
                var btnChatShowHide = document.getElementById( 'btnChatShowHide' );
console.log("onSipEventStack - i_new_message - Debug 02: ", window.getComputedStyle( msgDiv ).display);
                if ( window.getComputedStyle( msgDiv ).display === "none" ) {
console.log("onSipEventStack - i_new_message - Debug 03: ");
                    btnChatShowHide.classList.add( 'btnBlink' );
                }
                chatEnum();
                if ( activeChat == msgFrom ) {
                    chatDisplay( msgFrom );
                }
                chatSave();
                //alert("From: " + msgFrom + " Time: " + msgTimeString + " Message: " + msgMessage);
                break;
            }

        case 'starting': default: break;
    }
};

// Callback function for SIP sessions (INVITE, REGISTER, MESSAGE...)
function onSipEventSession(e /* SIPml.Session.Event */) {
console.log("onSipEventSession - Debug 00", e);
    tsk_utils_log_info('==session event = ' + e.type);

    switch (e.type) {
        case 'connecting': case 'connected':
            {
console.log("onSipEventSession - connecting, connected - Debug 01", e.type);
                var bConnected = (e.type == 'connected');
                if (e.session == oSipSessionRegister) {
console.log("onSipEventSession - connecting, connected - Debug 02");
                    uiOnConnectionEvent(bConnected, !bConnected);
console.log("onSipEventSession - connecting, connected - Debug 03");
                    txtRegStatus.innerHTML = '<img src="images/reg-status-connected.png" height="24" /><i>' + e.description + '</i>';
                }
                else if (e.session == oSipSessionCall) {
console.log("onSipEventSession - connecting, connected - Debug 04");
                    btnHangUp.value = 'HangUp';
                    //btnCall.disabled = true;
                    btnAudio.disabled = true;
                    btnVideo.disabled = true;
                    btnScreenShare.disabled = true;
                    btnHangUp.disabled = false;
                    btnTransfer.disabled = false;
                    if (window.btnBFCP) window.btnBFCP.disabled = false;

console.log("onSipEventSession - connecting, connected - Debug 05");
                    if (bConnected) {
console.log("onSipEventSession - connecting, connected - Debug 06");
                        stopRingbackTone();
                        stopRingTone();

                        if (oNotifICall) {
console.log("onSipEventSession - connecting, connected - Debug 07");
                            oNotifICall.cancel();
                            oNotifICall = null;
                        }
                    }
console.log("onSipEventSession - connecting, connected - Debug 08");

                    txtCallStatus.innerHTML = "<i>" + e.description + "</i>";
                    // 2021.01.13 Edit by jgullo - Rather than doing this with opacity, hide it
                    if ( bConnected ) {
                        divCallWrapper.classList.add( 'border-top-separator' );
                    } else {
                        divCallWrapper.classList.remove( 'border-top-separator' );
                        //style.borderTop = bConnected ? 'thick solid #362886' : 'none';
                    }
                    divCallOptions.style.display = bConnected ? 'block' : 'none';

console.log("onSipEventSession - connecting, connected - Debug 09");
                    if (SIPml.isWebRtc4AllSupported()) { // IE don't provide stream callback
console.log("onSipEventSession - connecting, connected - Debug 10");
                        // Show remote video, show local camera, hide local screencast
                        uiVideoElementDraw( 1, 1 );
console.log("onSipEventSession - connecting, connected - Debug 12");
                    }
console.log("onSipEventSession - connecting, connected - Debug 13");
                }
                break;
            } // 'connecting' | 'connected'
        case 'terminating': case 'terminated':
            {
console.log("onSipEventSession - terminating, terminated - Debug 01", e.type);
                if (e.session == oSipSessionRegister) {
console.log("onSipEventSession - terminating, terminated - Debug 02", e.type);
                    uiOnConnectionEvent(false, false);
console.log("onSipEventSession - terminating, terminated - Debug 03", e.type);

                    oSipSessionCall = null;
                    oSipSessionRegister = null;

                    txtRegStatus.innerHTML = '<img src="images/reg-status-disconnected.png" height="24" /><i>' + e.description + '</i>';
                }
                else if (e.session == oSipSessionCall) {
console.log("onSipEventSession - terminating, terminated - Debug 04", e.type);
                    uiCallTerminated(e.description);
console.log("onSipEventSession - terminating, terminated - Debug 05", e.type);
                }
console.log("onSipEventSession - terminating, terminated - Debug 06", e.type);
                break;
            } // 'terminating' | 'terminated'

        case 'm_stream_video_local_added':
            {
console.log("onSipEventSession - m_stream_video_local_added - Debug 01");
                if (e.session == oSipSessionCall) {
                    // Don't change remote video, draw local camera, don't change local screencast
                    uiVideoElementDraw( 2, 1 );
                }
                break;
            }
        case 'm_stream_video_local_removed':
            {
console.log("onSipEventSession - m_stream_video_local_removed - Debug 01");
                if (e.session == oSipSessionCall) {
                    // Don't change remote video, hide local camera, don't change local screencast
                    uiVideoElementDraw( 2, 0 );
                }
                break;
            }
        case 'm_stream_video_remote_added':
            {
console.log("onSipEventSession - m_stream_video_remote_added - Debug 01");
                if (e.session == oSipSessionCall) {
                    // Draw remote video, hide local camera, hide local screencast
                    uiVideoElementDraw( 1, 2 );
                }
                break;
            }
        case 'm_stream_video_remote_removed':
            {
console.log("onSipEventSession - m_stream_video_remote_removed - Debug 01");
                if (e.session == oSipSessionCall) {
                    // Hide remote video, don't change local camera, don't change local screencast
                    uiVideoElementDraw( 0, 2 );
                }
                break;
            }

        case 'm_stream_audio_local_added':
        case 'm_stream_audio_local_removed':
        case 'm_stream_audio_remote_added':
        case 'm_stream_audio_remote_removed':
            {
console.log("onSipEventSession - m_stream_audio local/remote added/removed - Debug 01", e.type);
                break;
            }

        case 'i_ect_new_call':
            {
console.log("onSipEventSession - i_ect_new_call - Debug 01");
                oSipSessionTransferCall = e.session;
                break;
            }

        case 'i_ao_request':
            {
console.log("onSipEventSession - i_ao_request - Debug 01");
                if (e.session == oSipSessionCall) {
                    var iSipResponseCode = e.getSipResponseCode();
                    if (iSipResponseCode == 180 || iSipResponseCode == 183) {
                        startRingbackTone();
                        txtCallStatus.innerHTML = '<i>Remote ringing...</i>';
                    }
                }
                break;
            }

        case 'm_early_media':
            {
console.log("onSipEventSession - m_early_media - Debug 01");
                if (e.session == oSipSessionCall) {
                    stopRingbackTone();
                    stopRingTone();
                    txtCallStatus.innerHTML = '<i>Early media started</i>';
                }
                break;
            }

        case 'm_local_hold_ok':
            {
console.log("onSipEventSession - m_local_hold_ok - Debug 01");
                if (e.session == oSipSessionCall) {
                    if (oSipSessionCall.bTransfering) {
                        oSipSessionCall.bTransfering = false;
                        // this.AVSession.TransferCall(this.transferUri);
                    }
                    btnHoldResume.value = 'Resume';
                    btnHoldResume.disabled = false;
                    txtCallStatus.innerHTML = '<i>Call placed on hold</i>';
                    oSipSessionCall.bHeld = true;
                }
                break;
            }
        case 'm_local_hold_nok':
            {
console.log("onSipEventSession - m_local_hold_nok - Debug 01");
                if (e.session == oSipSessionCall) {
                    oSipSessionCall.bTransfering = false;
                    btnHoldResume.value = 'Hold';
                    btnHoldResume.disabled = false;
                    txtCallStatus.innerHTML = '<i>Failed to place remote party on hold</i>';
                }
                break;
            }
        case 'm_local_resume_ok':
            {
console.log("onSipEventSession - m_local_resume_ok - Debug 01");
                if (e.session == oSipSessionCall) {
                    oSipSessionCall.bTransfering = false;
                    btnHoldResume.value = 'Hold';
                    btnHoldResume.disabled = false;
                    txtCallStatus.innerHTML = '<i>Call taken off hold</i>';
                    oSipSessionCall.bHeld = false;

                    if (SIPml.isWebRtc4AllSupported()) { // IE don't provide stream callback yet
                        uiVideoDisplayEvent(false, true);
                        uiVideoDisplayEvent(true, true);
                    }
                }
                break;
            }
        case 'm_local_resume_nok':
            {
console.log("onSipEventSession - m_local_resume_nok - Debug 01");
                if (e.session == oSipSessionCall) {
                    oSipSessionCall.bTransfering = false;
                    btnHoldResume.disabled = false;
                    txtCallStatus.innerHTML = '<i>Failed to unhold call</i>';
                }
                break;
            }
        case 'm_remote_hold':
            {
console.log("onSipEventSession - m_remote_hold - Debug 01");
                if (e.session == oSipSessionCall) {
                    txtCallStatus.innerHTML = '<i>Placed on hold by remote party</i>';
                }
                break;
            }
        case 'm_remote_resume':
            {
console.log("onSipEventSession - m_remote_resume - Debug 01");
                if (e.session == oSipSessionCall) {
                    txtCallStatus.innerHTML = '<i>Taken off hold by remote party</i>';
                }
                break;
            }
        case 'm_bfcp_info':
            {
console.log("onSipEventSession - m_bfcp_info - Debug 01");
                if (e.session == oSipSessionCall) {
                    txtCallStatus.innerHTML = 'BFCP Info: <i>' + e.description + '</i>';
                }
                break;
            }

        case 'o_ect_trying':
            {
console.log("onSipEventSession - o_ect_trying - Debug 01");
                if (e.session == oSipSessionCall) {
                    txtCallStatus.innerHTML = '<i>Call transfer in progress...</i>';
                }
                break;
            }
        case 'o_ect_accepted':
            {
console.log("onSipEventSession - o_ect_accepted - Debug 01");
                if (e.session == oSipSessionCall) {
                    txtCallStatus.innerHTML = '<i>Call transfer accepted</i>';
                }
                break;
            }
        case 'o_ect_completed':
        case 'i_ect_completed':
            {
console.log("onSipEventSession - o_ect_completed, i_ect_completed - Debug 01", e.type);
                if (e.session == oSipSessionCall) {
                    txtCallStatus.innerHTML = '<i>Call transfer completed</i>';
                    btnTransfer.disabled = false;
                    if (oSipSessionTransferCall) {
                        oSipSessionCall = oSipSessionTransferCall;
                    }
                    oSipSessionTransferCall = null;
                }
                break;
            }
        case 'o_ect_failed':
        case 'i_ect_failed':
            {
console.log("onSipEventSession - o_ect_failed, i_ect_failed - Debug 01", e.type);
                if (e.session == oSipSessionCall) {
                    txtCallStatus.innerHTML = '<i>Call transfer failed</i>';
                    btnTransfer.disabled = false;
                }
                break;
            }
        case 'o_ect_notify':
        case 'i_ect_notify':
            {
console.log("onSipEventSession - o_ect_notify, i_ect_notify - Debug 01", e.type);
                if (e.session == oSipSessionCall) {
                    txtCallStatus.innerHTML = "<i>Call Transfer: <b>" + e.getSipResponseCode() + " " + e.description + "</b></i>";
                    if (e.getSipResponseCode() >= 300) {
                        if (oSipSessionCall.bHeld) {
                            oSipSessionCall.resume();
                        }
                        btnTransfer.disabled = false;
                    }
                }
                break;
            }
        case 'i_ect_requested':
            {
console.log("onSipEventSession - i_ect_requested - Debug 01");
                if (e.session == oSipSessionCall) {
                    var s_message = "Do you accept call transfer to [" + e.getTransferDestinationFriendlyName() + "]?";//FIXME
                    if (confirm(s_message)) {
                        txtCallStatus.innerHTML = "<i>Call transfer in progress...</i>";
                        oSipSessionCall.acceptTransfer();
                        break;
                    }
                    oSipSessionCall.rejectTransfer();
                }
                break;
            }
    }
}

// Functions for the Expert Settings form
function settingsSave() {
    window.localStorage.setItem('org.doubango.expert.disable_video', cbVideoDisable.checked ? "true" : "false");
    window.localStorage.setItem('org.doubango.expert.enable_rtcweb_breaker', cbRTCWebBreaker.checked ? "true" : "false");
    if (!txtWebsocketServerUrl.disabled) {
        window.localStorage.setItem('org.doubango.expert.websocket_server_url', txtWebsocketServerUrl.value);
    }
    window.localStorage.setItem('org.doubango.expert.sip_outboundproxy_url', txtSIPOutboundProxyUrl.value);
    window.localStorage.setItem('org.doubango.expert.ice_servers', txtIceServers.value);
    window.localStorage.setItem('org.doubango.expert.bandwidth', txtBandwidth.value);
    window.localStorage.setItem('org.doubango.expert.video_size', txtSizeVideo.value);
    window.localStorage.setItem('org.doubango.expert.disable_early_ims', cbEarlyIMS.checked ? "true" : "false");
    window.localStorage.setItem('org.doubango.expert.disable_debug', cbDebugMessages.checked ? "true" : "false");
    window.localStorage.setItem('org.doubango.expert.enable_media_caching', cbCacheMediaStream.checked ? "true" : "false");
    window.localStorage.setItem('org.doubango.expert.disable_callbtn_options', cbCallButtonOptions.checked ? "true" : "false");

    txtInfo.innerHTML = '<i>Saved</i>';
}

function settingsRevert(bNotUserAction) {
    cbVideoDisable.checked = (window.localStorage.getItem('org.doubango.expert.disable_video') == "true");
    cbRTCWebBreaker.checked = (window.localStorage.getItem('org.doubango.expert.enable_rtcweb_breaker') == "true");
    txtWebsocketServerUrl.value = (window.localStorage.getItem('org.doubango.expert.websocket_server_url') || "");
    txtSIPOutboundProxyUrl.value = (window.localStorage.getItem('org.doubango.expert.sip_outboundproxy_url') || "");
    txtIceServers.value = (window.localStorage.getItem('org.doubango.expert.ice_servers') || "");
    txtBandwidth.value = (window.localStorage.getItem('org.doubango.expert.bandwidth') || "");
    txtSizeVideo.value = (window.localStorage.getItem('org.doubango.expert.video_size') || "");
    cbEarlyIMS.checked = (window.localStorage.getItem('org.doubango.expert.disable_early_ims') == "true");
    cbDebugMessages.checked = (window.localStorage.getItem('org.doubango.expert.disable_debug') == "true");
    cbCacheMediaStream.checked = (window.localStorage.getItem('org.doubango.expert.enable_media_caching') == "true");
    cbCallButtonOptions.checked = (window.localStorage.getItem('org.doubango.expert.disable_callbtn_options') == "true");


    if (!bNotUserAction) {
        txtInfo.innerHTML = '<i>Reverted</i>';
    }
}
