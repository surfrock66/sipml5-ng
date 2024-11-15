﻿/*
* Copyright (C) 2012-2016 Doubango Telecom <http://www.doubango.org>
* License: BSD
* This file is part of Open Source sipML5 solution <http://www.sipml5.org>
*
* Modified by jgullo of SEIU Local 1000 as part of the development of
*  the reference implementation into a complete and usable SIP webphone.
*  This code was originally embedded in the call.html file as part of
*  doubango's demo, but has been split into its own js file and many 
*  features have been added:
*  - SMS, with persistence between sessions
*  - Pop-up notifications for SMS and calls
*  - Admin controlled custom shortcuts
*  - User editable and saveable custom shortcuts
*  - More modern HTML5 WebRTC adaptive interface
*  - Modular theming so other organizations can customize the appearance
*  - Switch from 'localStorage' to 'sessionStorage' for security
*  - Added function for microphone audio to be accompanied with screen share
*/

// Variables from the main phone functions
var sTransferNumber;
var oRingTone, oRingbackTone;
var oSipStack, oSipSessionRegister, oSipSessionCall, oSipSessionHeldCall, oSipSessionTransferCall;
var videoRemote, videoLocal, audioRemote;
var bFullScreen = false;
var bSwitchingCalls = false; // Holds state for the operation to switch calls, which has to be in sequence
var bHeldCallPendingHangup = false; // Holds state for whether the held call is pending hangup
var oNotifICall;
var bDisableVideo = false;
var viewVideoLocal, viewVideoRemote, viewLocalScreencast; // <video> (webrtc) or <div> (webrtc4all)
var oConfigCall;
var oReadyStateTimer;
var oSubscribedShortcuts = {}; // Stores sessions for monitoring presence status
var oSubscriptionEventListeners = {}; // Listeners for subscriptions

// Variables from the Expert Options page
var cbVideoDisable;
var cbAVPFDisable;
var txtWebsocketServerUrl;
var txtSIPOutboundProxyUrl;
var txtInfo;

window.onload = function () {
    window.console && window.console.info && window.console.info("location=" + window.location);

    audioRemote = document.getElementById("audio_remote");

    document.onkeyup = onKeyUp;
    document.body.onkeyup = onKeyUp;
    divCallCtrl.onmousemove = onDivCallCtrlMouseMove;

    // set debug level
    SIPml.setDebugLevel((window.sessionStorage && window.sessionStorage.getItem('org.doubango.expert.disable_debug') == "true") ? "error" : "info");

    loadCredentials();
    loadCallOptions();

    // Initialize call button
    //uiBtnCallSetText("Call");

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
    }

    oReadyStateTimer = setInterval(function () {
        if (document.readyState === "complete") {
            clearInterval(oReadyStateTimer);
            // initialize SIPML5
            preInit();
            // If DB isn't enabled, don't let users edit shortcuts
            var btnShortcutEdit = document.getElementById( 'shortcutEditBtn' );
            if ( ! window.sessionStorage.getItem( 'org.doubango.dbenabled' ) ) {
                btnShortcutEdit.style.display = "none";
            }
            // If DB isn't enabled, don't let users see history
            var divHistory = document.getElementById( 'divHistory' );
            var btnHistoryShowHide = document.getElementById( 'btnHistoryShowHide' );
            if ( ! window.sessionStorage.getItem( 'org.doubango.dbenabled' ) ) {
                divHistory.style.display = "none";
                btnHistoryShowHide.style.display = "none";
            }
            // Having the password in the local storage is our canary that we can auto-login
            if ( ( window.sessionStorage.getItem('org.doubango.identity.password') !== null ) && ( window.sessionStorage.getItem('org.doubango.identity.password') != "" ) ) {
                sipRegister();
            } else {
                var offcanvas_aside = document.getElementById( 'registrationOffcanvas' );
                $('body').toggleClass("offcanvas-active");
                offcanvas_aside.classList.add( "show" );
            }
        }
    },
    500);

    // The following code is for the Expert Settings Panel
    cbVideoDisable = document.getElementById("cbVideoDisable");
    cbRTCWebBreaker = document.getElementById("cbRTCWebBreaker");
    txtWebsocketServerUrl = document.getElementById("txtWebsocketServerUrl");
    txtSIPOutboundProxyUrl = document.getElementById("txtSIPOutboundProxyUrl");
    txtInfo = document.getElementById("txtInfo");

    //txtWebsocketServerUrl.disabled = !window.WebSocket || navigator.appName == "Microsoft Internet Explorer"; // Do not use WS on IE
    document.getElementById("btnSave").disabled = !window.sessionStorage;
    document.getElementById("btnRevert").disabled = !window.sessionStorage;

    if(window.sessionStorage){
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

// Function to convert a unix timestamp to a formatted time, either long or short
function timeConverter( UNIX_timestamp, displayType ){
    var a = new Date(UNIX_timestamp);
    var year = a.getFullYear();
    var month = a.getMonth();
    var date = a.getDate();
    var hour = a.getHours().toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false});
    var min = a.getMinutes().toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false});
    var sec = a.getSeconds().toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false});
    var ampm = 'AM';
    if( hour >= 12 ) {
        if ( hour > 12 ) {
            hour = hour - 12;
        }
        ampm = 'PM';
    }
    if ( displayType == "short" ) {
        month = month + 1;
        var time = month + '/' + date + '/' + year + ' ' + hour + ':' + min + ':' + sec + ' ' + ampm;
    }
    else {
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var month = months[a.getMonth()];
        var time = month + ' ' + date + ', ' + year + ' - ' + hour + ':' + min + ':' + sec + ' ' + ampm;
    }
    
    return time;
}

// Function to globally show/hide keypad
function uiShowHideKeyPad( show ) {
    var divKeyPad = document.getElementById( 'divKeyPad' );
    var btnKeyPadShowHide = document.getElementById( 'btnKeyPadShowHide' );
    if ( show ) {
        window.localStorage.setItem('org.doubango.uiPref.keypadVisible', "1");
        divKeyPad.style.display = 'block';
        divKeyPad.classList.add( 'border-top-separator' );
        divKeyPad.classList.add( 'theme-accent-color-border' );
        btnKeyPadShowHide.value = 'Hide KeyPad';
        btnKeyPadShowHide.setAttribute( 'onclick', 'uiShowHideKeyPad( 0 )' );
    } else {
        window.localStorage.setItem('org.doubango.uiPref.keypadVisible', "0");
        divKeyPad.style.display = 'none';
        divKeyPad.classList.remove( 'border-top-separator' );
        divKeyPad.classList.remove( 'theme-accent-color-border' );
        btnKeyPadShowHide.value = 'Show KeyPad';
        btnKeyPadShowHide.setAttribute( 'onclick', 'uiShowHideKeyPad( 1 )' );
    }
}

// Function to globally show/hide shortcuts
function uiShowHideShortcuts( show ) {
    var divShortcuts = document.getElementById( 'divShortcuts' );
    var btnShortcutsShowHide = document.getElementById( 'btnShortcutsShowHide' );
    if ( show ) {
        window.localStorage.setItem('org.doubango.uiPref.shortcutsVisible', "1");
        divShortcuts.style.display = 'block';
        divShortcuts.classList.add( 'border-top-separator' );
        divShortcuts.classList.add( 'theme-accent-color-border' );
        btnShortcutsShowHide.value = 'Hide Shortcuts';
        btnShortcutsShowHide.setAttribute( 'onclick', 'uiShowHideShortcuts( 0 )' );
    } else {
        window.localStorage.setItem('org.doubango.uiPref.shortcutsVisible', "0");
        divShortcuts.style.display = 'none';
        divShortcuts.classList.remove( 'border-top-separator' );
        divShortcuts.classList.remove( 'theme-accent-color-border' );
        btnShortcutsShowHide.value = 'Show Shortcuts';
        btnShortcutsShowHide.setAttribute( 'onclick', 'uiShowHideShortcuts( 1 )' );
    }
}

// Function to globally show/hide history
function uiShowHideHistory( show ) {
    var divHistory = document.getElementById( 'divHistory' );
    var btnHistoryShowHide = document.getElementById( 'btnHistoryShowHide' );
    if ( show ) {
        window.localStorage.setItem('org.doubango.uiPref.historyVisible', "1");
        divHistory.style.display = 'block';
        divHistory.classList.add( 'border-top-separator' );
        divHistory.classList.add( 'theme-accent-color-border' );
        btnHistoryShowHide.value = 'Hide History';
        btnHistoryShowHide.setAttribute( 'onclick', 'uiShowHideHistory( 0 )' );
    } else {
        window.localStorage.setItem('org.doubango.uiPref.historyVisible', "0");
        divHistory.style.display = 'none';
        divHistory.classList.remove( 'border-top-separator' );
        divHistory.classList.remove( 'theme-accent-color-border' );
        btnHistoryShowHide.value = 'Show History';
        btnHistoryShowHide.setAttribute( 'onclick', 'uiShowHideHistory( 1 )' );
    }
}

// Utility  function to detect iOS, because the notification API doesn't work there
function iOS() {
    return [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ].includes(navigator.platform)
    // iPad on iOS 13 detection
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}

// Function to enumerate call history from localstorage object
function historyEnum() {
    var btnHistoryShowHide = document.getElementById( 'btnHistoryShowHide' );
    historyLog = ( "" == window.sessionStorage.getItem( 'org.doubango.history' ) ? [] : JSON.parse( window.sessionStorage.getItem( 'org.doubango.history' ) ) );
    if ( historyLog.length == 0 ) {
        btnHistoryShowHide.disabled = true;
    } else {
        btnHistoryShowHide.disabled = false;
        let historyEntries = historyLog;
        // Check if we are at the limit for stored history
        if ( typeof historyEntries !== 'undefined' ) {
            var historyDiv = document.getElementById("divHistory");
            var btnHistoryShowHide = document.getElementById( 'btnHistoryShowHide' );
            var historyListDiv = document.getElementById( 'divHistoryList' );
            historyListDiv.innerText = "";
            var historyListTable = document.createElement( 'table' );
            historyListTable.setAttribute( 'border' , '1' );
            historyListTable.setAttribute( 'id' , 'historyListTable' );
            historyListTable.classList.add( 'theme-accent-color-border' );
            var historyListTableRow = document.createElement( 'tr' );
            historyListTable.appendChild( historyListTableRow );
            var historyListTableCol1 = document.createElement( 'th' );
            historyListTableCol1.innerText = "Direction";
            historyListTableRow.appendChild( historyListTableCol1 );
            var historyListTableCol2 = document.createElement( 'th' );
            historyListTableCol2.innerText = "Type";
            historyListTableRow.appendChild( historyListTableCol2 );
            var historyListTableCol3 = document.createElement( 'th' );
            historyListTableCol3.innerText = "Timestamp";
            historyListTableRow.appendChild( historyListTableCol3 );
            var historyListTableCol4 = document.createElement( 'th' );
            historyListTableCol4.innerText = "Phone Number";
            historyListTableRow.appendChild( historyListTableCol4 );
            var historyListTableCol5 = document.createElement( 'th' );
            historyListTableCol5.innerText = "ID";
            historyListTableRow.appendChild( historyListTableCol5 );
            var historyListTableCol6 = document.createElement( 'th' );
            historyListTableCol6.innerText = "";
            historyListTableRow.appendChild( historyListTableCol6 );
            historyListDiv.appendChild( historyListTable );
            historyEntries.slice().reverse().forEach( historyEntry => {
                    var historyListTableRow = document.createElement( 'tr' );
                    var historyListTableCol1 = document.createElement( 'td' );
                    historyListTableCol1.innerText = historyEntry.inOut;
                    historyListTableRow.appendChild( historyListTableCol1 );
                    var historyListTableCol2 = document.createElement( 'td' );
                    historyListTableCol2.innerText = historyEntry.type;
                    historyListTableRow.appendChild( historyListTableCol2 );
                    var historyListTableCol3 = document.createElement( 'td' );
                    historyListTableCol3.innerText = timeConverter( historyEntry.timestamp , "full" );
                    historyListTableRow.appendChild( historyListTableCol3 );
                    var historyListTableCol4 = document.createElement( 'td' );
                    historyListTableCol4.innerText = historyEntry.callTarget;
                    historyListTableRow.appendChild( historyListTableCol4 );
                    var historyListTableCol5 = document.createElement( 'td' );
                    historyListTableCol5.innerText = historyEntry.callID;
                    historyListTableRow.appendChild( historyListTableCol5 );
                    var historyListTableCol6 = document.createElement( 'td' );
                    historyListTableRow.appendChild( historyListTableCol6 );
                    // Audio Call Button
                    var hisAudBtn = document.createElement('button');
                    hisAudBtn.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
                    hisAudBtn.setAttribute( 'title' , 'Audio' );
                    hisAudBtn.setAttribute( 'id' , 'historyAudio' + historyEntry.callTarget );
                    hisAudBtn.setAttribute( 'onclick' , 'historyRun("Audio", "' + historyEntry.callTarget + '");' );
                    historyListTableCol6.appendChild( hisAudBtn );
                    var hisAudBtnImg = document.createElement('img');
                    hisAudBtnImg.setAttribute( 'src', 'images/sipml5_ng.action.phone.png');
                    hisAudBtnImg.setAttribute( 'class', 'icon' );
                    hisAudBtn.appendChild( hisAudBtnImg );
                    // Video Call Button
                    var hisVidBtn = document.createElement('button');
                    hisVidBtn.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
                    hisVidBtn.setAttribute( 'title' , 'Video' );
                    hisVidBtn.setAttribute( 'id' , 'historyVideo' + historyEntry.callTarget );
                    hisVidBtn.setAttribute( 'onclick' , 'historyRun("Video", "' + historyEntry.callTarget + '");' );
                    if ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false ) {
                        hisVidBtn.disabled = 'true';
                    }
                    historyListTableCol6.appendChild( hisVidBtn );
                    var hisVidBtnImg = document.createElement('img');
                    hisVidBtnImg.setAttribute( 'src', 'images/sipml5_ng.action.video.png');
                    hisVidBtnImg.setAttribute( 'class', 'icon' );
                    hisVidBtn.appendChild( hisVidBtnImg );
                    // Screenshare Call Button
                    var hisScrBtn = document.createElement('button');
                    hisScrBtn.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
                    hisScrBtn.setAttribute( 'title' , 'Screenshare' );
                    hisScrBtn.setAttribute( 'id' , 'historyScreenshare' + historyEntry.callTarget );
                    hisScrBtn.setAttribute( 'onclick' , 'historyRun("Screenshare", "' + historyEntry.callTarget + '");' );
                    if ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false ) {
                        hisScrBtn.disabled = 'true';
                    }
                    historyListTableCol6.appendChild( hisScrBtn );
                    var hisScrBtnImg = document.createElement('img');
                    hisScrBtnImg.setAttribute( 'src', 'images/sipml5_ng.action.screenshare.png');
                    hisScrBtnImg.setAttribute( 'class', 'icon' );
                    hisScrBtn.appendChild( hisScrBtnImg );
                    historyListTable.appendChild( historyListTableRow );
                }
            );
        }
    }
}

// Function to append a history entry to the history log
function historyAppendLog( hisDirection, hisType, hisTime, hisExt, hisID ) {
    // Create call history entry
    historyLog = ( "" == window.sessionStorage.getItem( 'org.doubango.history' ) ? [] : JSON.parse( window.sessionStorage.getItem( 'org.doubango.history' ) ) );
    maxHistory = ( "" == window.sessionStorage.getItem( 'org.doubango.history.max_entries' ) ? "" : window.sessionStorage.getItem( 'org.doubango.history.max_entries' ) );
    var callType = "Audio";
    // If a video or screen share call is starting, draw the video UI
    if ( hisType == 'call-audiovideo' || hisType == 'call-screenshare' ) {
        // Video call, so show remote video, show local video, hide local screenshare
        if ( hisType == 'call-audiovideo' ) {
            callType = "Video";
        } else if ( hisType == 'call-screenshare' ) {
            callType = "Screenshare";
        }
    }
    let historyEntries = historyLog;
    let historyEntry = {
        "inOut": hisDirection,
        "type": callType,
        "timestamp": hisTime,
        "callTarget": hisExt,
        "callID": hisID
    }
    // Check if we are at the limit for stored history
    if ( typeof historyEntries !== 'undefined' ) {
        if ( maxHistory != "" && maxHistory == historyEntries.length ) {
            historyEntries.shift();
        }
    } else {
        historyEntries = [];
    }
    historyEntries.push(historyEntry);
    window.sessionStorage.setItem('org.doubango.history', JSON.stringify(historyEntries));
    historyEnum();
    historySave();
}

// Dial a history item
function historyRun( callType, callTarget ) {
    window.sessionStorage.setItem( 'org.doubango.call.phone_number', callTarget );
    document.getElementById( 'txtPhoneNumber' ).value = callTarget;
    if ( callType == 'Audio' ) {
        sipCall("call-audio");
    } else if ( callType == 'Video' ) {
        sipCall("call-audiovideo");
    } else if ( callType == 'Screenshare' ) {
        sipShareScreen();
    } else {
        console.log( 'historyRun - Debug - Dialing Action Not Recognized!!!' );
    }
}

// Write history to the DB if that's configured for session persistence
function historySave() {
    $.ajax({
        url: 'includes/saveToDB.php',
        type: 'POST',
        data: {
            action:'saveHistory',
            extension:window.sessionStorage.getItem( 'org.doubango.identity.impi' ),
            history:window.sessionStorage.getItem( 'org.doubango.history' )
        },
        success: function(data) {
            console.log(data); 
        }
    });
}

// Function to enumerate shortcuts from localstorage object
function shortcutEnum() {
    shortcutsObj = ( "" == window.sessionStorage.getItem( 'org.doubango.shortcuts' ) ? [] : JSON.parse( window.sessionStorage.getItem( 'org.doubango.shortcuts' ) ) );
    var divShortcuts = document.getElementById("divShortcuts");
    var btnShortcutsShowHide = document.getElementById( 'btnShortcutsShowHide' );
    if ( shortcutsObj.length == 0 ) {
        //btnShortcutsShowHide.disabled = true;
    } else {
        btnShortcutsShowHide.disabled = false;
        var shortcutListDiv = document.getElementById( 'divShortcutsList' );
        shortcutListDiv.innerText = "";
        var shortcutListTable = document.createElement('table');


        shortcutListTable.setAttribute( 'border' , '1' );
        shortcutListTable.setAttribute( 'id' , 'shortcutListTable' );
        shortcutListTable.classList.add( 'theme-accent-color-border' );
        var shortcutListTableRow = document.createElement( 'tr' );
        shortcutListTable.appendChild( shortcutListTableRow );
        var shortcutListTableCol1 = document.createElement( 'th' );
        shortcutListTableCol1.innerText = "Shortcut Name";
        shortcutListTableRow.appendChild( shortcutListTableCol1 );
        var shortcutListTableCol2 = document.createElement( 'th' );
        shortcutListTableCol2.innerText = "Online";
        shortcutListTableRow.appendChild( shortcutListTableCol2 );
        var shortcutListTableCol3 = document.createElement( 'th' );
        shortcutListTableCol3.innerText = "";
        shortcutListTableRow.appendChild( shortcutListTableCol3 );


        shortcutsObj.forEach( shortcut => {

                var shortcutListTableRow = document.createElement( 'tr' );
                var shortcutListTableCol1 = document.createElement( 'td' );
                shortcutListTableCol1.innerText = shortcut.displayName;
                shortcutListTableRow.appendChild( shortcutListTableCol1 );

                if ( shortcut.action == "DTMF" ) {
                    var shortcutListTableCol2 = document.createElement( 'td' );
                    shortcutListTableRow.appendChild( shortcutListTableCol2 );
                    var shortcutListTableCol3 = document.createElement( 'td' );
                    var shortcutBtn = document.createElement('button');
                    shortcutBtn.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
                    shortcutBtn.setAttribute( 'id' , 'shortcut' + shortcut.order );
                    shortcutBtn.setAttribute( 'onclick' , 'shortcutRun("DTMF", "' + shortcut.number + '");' );
                    shortcutBtn.setAttribute( 'title' , shortcut.displayName );
                    shortcutBtn.innerText = shortcut.displayName;
                    shortcutListTableCol3.appendChild( shortcutBtn );
                    shortcutListTableRow.appendChild( shortcutListTableCol3 );
                    
                } else {
                    var shortcutListTableCol2 = document.createElement( 'td' );
                    shortcutListTableCol2.setAttribute( 'id' , 'presence' + shortcut.order );
                    var shortcutPresenceIcon = document.createElement( 'img' );
                    shortcutPresenceIcon.setAttribute( 'id' , 'presenceIcon' + shortcut.order );
                    shortcutPresenceIcon.setAttribute( 'height' , '24' );
                    shortcutPresenceIcon.setAttribute( 'src' , 'images/sipml5_ng.status.offline.png' );
                    shortcutListTableCol2.appendChild( shortcutPresenceIcon );
                    shortcutListTableRow.appendChild( shortcutListTableCol2 );
                    var shortcutListTableCol3 = document.createElement( 'td' );

                    // Audio Call Button
                    var shortcutAudBtn = document.createElement('button');
                    shortcutAudBtn.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
                    shortcutAudBtn.setAttribute( 'title' , 'Audio' );
                    shortcutAudBtn.setAttribute( 'id' , 'shortcutAudio' + shortcut.order );
                    shortcutAudBtn.setAttribute( 'onclick' , 'shortcutRun("Audio", "' + shortcut.number + '");' );
                    shortcutListTableCol3.appendChild( shortcutAudBtn );
                    var shortcutAudBtnImg = document.createElement('img');
                    shortcutAudBtnImg.setAttribute( 'src', 'images/sipml5_ng.action.phone.png');
                    shortcutAudBtnImg.setAttribute( 'class', 'icon' );
                    shortcutAudBtn.appendChild( shortcutAudBtnImg );

                    // Video Call Button
                    var shortcutVidBtn = document.createElement('button');
                    shortcutVidBtn.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
                    shortcutVidBtn.setAttribute( 'title' , 'Video' );
                    shortcutVidBtn.setAttribute( 'id' , 'shortcutVideo' + shortcut.order );
                    shortcutVidBtn.setAttribute( 'onclick' , 'shortcutRun("Video", "' + shortcut.number + '");' );
                    if ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false ) {
                        shortcutVidBtn.disabled = 'true';
                    }
                    shortcutListTableCol3.appendChild( shortcutVidBtn );
                    var shortcutVidBtnImg = document.createElement('img');
                    shortcutVidBtnImg.setAttribute( 'src', 'images/sipml5_ng.action.video.png');
                    shortcutVidBtnImg.setAttribute( 'class', 'icon' );
                    shortcutVidBtn.appendChild( shortcutVidBtnImg );

                    // Screenshare Call Button
                    var shortcutScrBtn = document.createElement('button');
                    shortcutScrBtn.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
                    shortcutScrBtn.setAttribute( 'title' , 'Screenshare' );
                    shortcutScrBtn.setAttribute( 'id' , 'shortcutScreenshare' + shortcut.order );
                    shortcutScrBtn.setAttribute( 'onclick' , 'shortcutRun("Screenshare", "' + shortcut.number + '");' );
                    if ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false ) {
                        shortcutScrBtn.disabled = 'true';
                    }
                    shortcutListTableCol3.appendChild( shortcutScrBtn );
                    var shortcutScrBtnImg = document.createElement('img');
                    shortcutScrBtnImg.setAttribute( 'src', 'images/sipml5_ng.action.screenshare.png');
                    shortcutScrBtnImg.setAttribute( 'class', 'icon' );
                    shortcutScrBtn.appendChild( shortcutScrBtnImg );

                    // Chat Button
                    var shortcutChatBtn = document.createElement('button');
                    shortcutChatBtn.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
                    shortcutChatBtn.setAttribute( 'title' , 'Chat' );
                    shortcutChatBtn.setAttribute( 'id' , 'shortcutChat' + shortcut.order );
                    shortcutChatBtn.setAttribute( 'onclick' , 'shortcutRun("Chat", "' + shortcut.number + '");' );
                    shortcutListTableCol3.appendChild( shortcutChatBtn );
                    var shortcutChatBtnImg = document.createElement('img');
                    shortcutChatBtnImg.setAttribute( 'src', 'images/sipml5_ng.action.chat.png');
                    shortcutChatBtnImg.setAttribute( 'class', 'icon' );
                    shortcutChatBtn.appendChild( shortcutChatBtnImg );

                    shortcutListTableRow.appendChild( shortcutListTableCol3 );

                    internalExtMaxLen = ( null == window.sessionStorage.getItem( 'org.doubango.internal_ext_max_length' ) ? null : window.sessionStorage.getItem( 'org.doubango.internal_ext_max_length' ) );

                    if ( internalExtMaxLen == null || internalExtMaxLen >= shortcut.number.length ) {
                        var subscribeSession;
                        oSubscriptionEventListeners[ shortcut.number ] = function(e){
//                            console.info('session event = ' + e.type);
                            if(e.type == 'i_notify'){
//                                console.info('NOTIFY content = ' + e.getContentString());
//                                console.info('NOTIFY content-type = ' + e.getContentType());
  
                                if (e.getContentType() == 'application/pidf+xml') {
                                    if (window.DOMParser) {
                                        var parser = new DOMParser();
                                        var xmlDoc = parser ? parser.parseFromString(e.getContentString(), "text/xml") : null;
                                        var presenceNode = xmlDoc ? xmlDoc.getElementsByTagName ("presence")[0] : null;
                                        if(presenceNode){
//console.log(presenceNode);
                                            var entityUri = presenceNode.getAttribute ("entity");
                                            var tupleNode = presenceNode.getElementsByTagName ("tuple")[0];
                                            if(entityUri && tupleNode){
                                                var statusNode = tupleNode.getElementsByTagName ("status")[0];
                                                if(statusNode){
                                                    var basicNode = statusNode.getElementsByTagName ("basic")[0];
                                                    if(basicNode){
                                                        var presenceIndicator = document.getElementById( 'presenceIcon' + shortcut.order );
                                                        if ( basicNode.textContent == 'open' ) {
                                                            presenceIndicator.setAttribute( 'src', 'images/sipml5_ng.status.online.png' );
                                                            var dmpeople = presenceNode.getElementsByTagName ("dm:person");
                                                            if( dmpeople.length != 0 ) {
                                                                for ( let i = 0; i < dmpeople.length; i++ ) {
                                                                    var dmperson = dmpeople[i];
                                                                    if ( dmperson.children.length != 0 ) {
                                                                        for ( let j = 0; j < dmperson.children.length; j++) {
                                                                            var personAttributes = dmperson.children[j];
                                                                            if ( personAttributes.children.length != 0 ) {
                                                                                if ( personAttributes.tagName == "rpid:activities" ) {
                                                                                    for ( let k = 0; k < personAttributes.children.length; k++ ) {
                                                                                        var activitiesList = personAttributes.children[k];
                                                                                        if ( activitiesList.tagName == "rpid:on-the-phone" ) {
                                                                                            presenceIndicator.setAttribute( 'src', 'images/sipml5_ng.status.busy.png' );
                                                                                        }
                                                                                    }
                                                                                } else if ( personAttributes.tagName == "rpid:mood" ) {    
                                                                                    for ( let k = 0; k < personAttributes.children.length; k++ ) {
                                                                                        var moodList = personAttributes.children[k];
//                                                                                        if ( activitiesList.tagName == "rpid:on-the-phone" ) {
//                                                                                            presenceIndicator.setAttribute( 'src', 'images/sipml5_ng.status.busy.png' );
//                                                                                        }
                                                                                    }
                                                                                }
                                                                            }    
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        } else if ( basicNode.textContent == 'closed' ) {
                                                            presenceIndicator.setAttribute( 'src', 'images/sipml5_ng.status.offline.png' );
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        subscribeSession = oSipStack.newSession('subscribe', {
                                expires: 200,
                                events_listener: { events: '*', listener: oSubscriptionEventListeners[ shortcut.number ] },
                                sip_headers: [
                                              { name: 'Event', value: 'presence' }, // only notify for 'presence' events
                                              { name: 'Accept', value: 'application/pidf+xml' } // supported content types (COMMA-sparated)
                                    ],
                                sip_caps: [
                                            { name: '+g.oma.sip-im', value: null },
                                            { name: '+audio', value: null },
                                            { name: 'language', value: '\"en,fr\"' }
                                    ]
                            }
                        );
                        oSubscribedShortcuts[ shortcut.number ] = subscribeSession;
    
                        // start watching for entity's presence status (You may track event type 'connected' to be sure that the request has been accepted by the server)
                        oSubscribedShortcuts[ shortcut.number ].subscribe(shortcut.number);
                    } 
                }
                shortcutListTable.appendChild( shortcutListTableRow );
            }
        );
        shortcutListDiv.appendChild( shortcutListTable );
    }
}

// Function to populate shortcut editor pane
function shortcutsEditDraw() {
    var divShortcutsEditor = document.getElementById( 'divShortcutsEditor' );
    divShortcutsEditor.innerHTML = '';
    shortcutsObj = ( "" == window.sessionStorage.getItem( 'org.doubango.shortcuts' ) ? [] : JSON.parse( window.sessionStorage.getItem( 'org.doubango.shortcuts' ) ) );
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
            shortcutEditBtn.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
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
            shortcutDeleteBtn.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
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
    shortcutAddBtn.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
    shortcutAddBtn.setAttribute( 'id' , 'shortcutAddBtn' );
    shortcutAddBtn.setAttribute( 'href' , '#' );
    shortcutAddBtn.setAttribute( 'onclick' , 'shortcutAdd( "", "" );' );
    shortcutAddBtn.setAttribute( 'value' , 'Add' );
    divShortcutsEditor.appendChild( shortcutAddBtn );
    var shortcutReorderBtn = document.createElement('input');
    shortcutReorderBtn.setAttribute( 'type' , 'button' );
    shortcutReorderBtn.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
    shortcutReorderBtn.setAttribute( 'id' , 'shortcutReorderBtn' );
    shortcutReorderBtn.setAttribute( 'href' , '#' );
    shortcutReorderBtn.setAttribute( 'onclick' , 'shortcutsOrderDraw();' );
    shortcutReorderBtn.setAttribute( 'value' , 'Reorder' );
    divShortcutsEditor.appendChild( shortcutReorderBtn );
}

// Function to edit a specific shortcut
function shortcutEdit( shortcutSelect ) {
    var shortcutsObj = ( JSON.parse( window.sessionStorage.getItem( 'org.doubango.shortcuts' ) ) );
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
        var optionContact = document.createElement("option");
        optionContact.text = "Favorite";
        inputShortcutAction.add( optionContact );
        var optionDTMF = document.createElement("option");
        optionDTMF.text = "DTMF";
        inputShortcutAction.add( optionDTMF );
        inputShortcutAction.value = shortcutsObj[shortcutSelect].action;
        var inputShortcutOrder = document.createElement( 'input' );
        inputShortcutOrder.setAttribute( 'type', 'hidden' );
        inputShortcutOrder.setAttribute( 'id', 'shortcutEditInputOrder' + shortcutSelect );
        divShortcutEditBlock.appendChild( inputShortcutOrder );
                    
        var shortcutEditSaveBtn = document.createElement('a');
        shortcutEditSaveBtn.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
        shortcutEditSaveBtn.setAttribute( 'id' , 'shortcutEditSave' + shortcutSelect );
        shortcutEditSaveBtn.setAttribute( 'href' , '#' );
        shortcutEditSaveBtn.setAttribute( 'onclick' , 'shortcutEditSave("' + shortcutSelect + '");' );
        shortcutEditSaveBtn.innerText = 'Save';
        divShortcutEditBlock.appendChild( shortcutEditSaveBtn );

        var shortcutEditCancelBtn = document.createElement('input');
        shortcutEditCancelBtn.setAttribute( 'type' , 'button' );
        shortcutEditCancelBtn.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
        shortcutEditCancelBtn.setAttribute( 'id' , 'shortcutEditCancel' );
        shortcutEditCancelBtn.setAttribute( 'href' , '#' );
        shortcutEditCancelBtn.setAttribute( 'onclick' , 'shortcutEnum(); shortcutsEditDraw();');
        shortcutEditCancelBtn.setAttribute( 'value' , 'Cancel' );
        divShortcutEditBlock.appendChild( shortcutEditCancelBtn );

    }
}

// Function to populate shortcut ordering pane
function shortcutsOrderDraw() {
    var divShortcutsEditor = document.getElementById( 'divShortcutsEditor' );
    divShortcutsEditor.innerHTML = '';
    var pShortcutInstructions = document.createElement( 'p' );
    pShortcutInstructions.innerText = 'Please enter the desired order by inputting the new position for each shortcut in the input box, making sure to start at 1 and avoid skipping any numbers.';
    divShortcutsEditor.appendChild( pShortcutInstructions );
    shortcutsObj = ( "" == window.sessionStorage.getItem( 'org.doubango.shortcuts' ) ? [] : JSON.parse( window.sessionStorage.getItem( 'org.doubango.shortcuts' ) ) );
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
    shortcutOrderSaveBtn.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
    shortcutOrderSaveBtn.setAttribute( 'id' , 'shortcutOrderSaveBtn' );
    shortcutOrderSaveBtn.setAttribute( 'href' , '#' );
    shortcutOrderSaveBtn.setAttribute( 'onclick' , 'shortcutOrderSave();' );
    shortcutOrderSaveBtn.setAttribute( 'value' , 'Save' );
    divShortcutsEditor.appendChild( shortcutOrderSaveBtn );
}

// Function to save reordering of shortcuts
function shortcutOrderSave() {
    var shortcutsObj = ( JSON.parse( window.sessionStorage.getItem( 'org.doubango.shortcuts' ) ) );
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
    window.sessionStorage.setItem( 'org.doubango.shortcuts', JSON.stringify( shortcutsObjNew ) );
    $.ajax({
        url: 'includes/saveToDB.php',
        type: 'POST',
        data: {
            action:'saveShortcuts',
            extension:window.sessionStorage.getItem( 'org.doubango.identity.impi' ),
            shortcuts:window.sessionStorage.getItem( 'org.doubango.shortcuts' )
        },
        success: function(data) {
            console.log("shortcut Deletion - Successfully Saved", data);
        }
    });
    shortcutEnum();
    shortcutsEditDraw();
}

// Function to delete a specific shortcut
function shortcutDelete( shortcutSelect ) {
    var shortcutsObj = ( JSON.parse( window.sessionStorage.getItem( 'org.doubango.shortcuts' ) ) );
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
        window.sessionStorage.setItem('org.doubango.shortcuts', JSON.stringify(shortcutsObj));
        $.ajax({
            url: 'includes/saveToDB.php',
            type: 'POST',
            data: {
                action:'saveShortcuts',
                extension:window.sessionStorage.getItem( 'org.doubango.identity.impi' ),
                shortcuts:window.sessionStorage.getItem( 'org.doubango.shortcuts' )
            },
            success: function(data) {
                console.log("shortcut Deletion - Successfully Saved", data); 
            }
        });
        shortcutEnum();
        shortcutsEditDraw();
    }
}

// Function to write changes to a shortcut
function shortcutEditSave( shortcutSelect ) {
    if ( document.getElementById( 'shortcutEditInputDisplayName' + shortcutSelect ).value == "" ) {
        alert( "Please enter a display name!" );
        return;
    }
    if ( document.getElementById( 'shortcutEditInputNumber' + shortcutSelect ).value == "" ) {
        alert( "Please enter a number for the shortcut!" );
        return;
    }
    var shortcutsObj = ( JSON.parse( window.sessionStorage.getItem( 'org.doubango.shortcuts' ) ) );
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
    window.sessionStorage.setItem('org.doubango.shortcuts', JSON.stringify(shortcutsObj));
    $.ajax({
        url: 'includes/saveToDB.php',
        type: 'POST',
        data: {
            action:'saveShortcuts',
            extension:window.sessionStorage.getItem( 'org.doubango.identity.impi' ),
            shortcuts:window.sessionStorage.getItem( 'org.doubango.shortcuts' )
        },
        success: function(data) {
            console.log("Shortcut Edit - Successfully Saved", data);
        }
    });
    shortcutEnum();
    shortcutsEditDraw();
}

// Function to add a shortcut
function shortcutAdd( shortcutName, shortcutNumber) {
    shortcutAddBtn = document.getElementById( 'shortcutAddBtn' );
    shortcutAddBtn.remove();
    var shortcutsObj = ( JSON.parse( window.sessionStorage.getItem( 'org.doubango.shortcuts' ) ) );
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
    inputShortcutDisplayName.setAttribute( 'value', shortcutName );
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
    inputShortcutNumber.setAttribute( 'value', shortcutNumber );
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

    var optionContact = document.createElement("option");
    optionContact.text = "Favorite";
    inputShortcutAction.add( optionContact );
    var optionDTMF = document.createElement("option");
    optionDTMF.text = "DTMF";
    inputShortcutAction.add( optionDTMF );
    var inputShortcutOrder = document.createElement( 'input' );
    inputShortcutOrder.setAttribute( 'type', 'hidden' );
    inputShortcutOrder.setAttribute( 'id', 'shortcutEditInputOrder' + shortcutNextOrder );
    divShortcutEditBlock.appendChild( inputShortcutOrder );
                    
    var shortcutEditSaveBtn = document.createElement('a');
    shortcutEditSaveBtn.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
    shortcutEditSaveBtn.setAttribute( 'id' , 'shortcutEditSave' + shortcutNextOrder );
    shortcutEditSaveBtn.setAttribute( 'href' , '#' );
    shortcutEditSaveBtn.setAttribute( 'onclick' , 'shortcutEditSave("' + shortcutNextOrder + '");' );
    shortcutEditSaveBtn.innerText = 'Save';
    divShortcutEditBlock.appendChild( shortcutEditSaveBtn );

    var shortcutEditCancelBtn = document.createElement('input');
    shortcutEditCancelBtn.setAttribute( 'type' , 'button' );
    shortcutEditCancelBtn.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
    shortcutEditCancelBtn.setAttribute( 'id' , 'shortcutEditCancel' );
    shortcutEditCancelBtn.setAttribute( 'href' , '#' );
    shortcutEditCancelBtn.setAttribute( 'onclick' , 'shortcutEnum(); shortcutsEditDraw();');
    shortcutEditCancelBtn.setAttribute( 'value' , 'Cancel' );
    divShortcutEditBlock.appendChild( shortcutEditCancelBtn );
}

// Activate a selected shortcut
async function shortcutRun( shortcutAction, shortcutNumber ) {
    window.sessionStorage.setItem( 'org.doubango.call.phone_number', shortcutNumber );
    if ( shortcutAction == 'DTMF' ) {
        for (var i = 0; i < shortcutNumber.length; i++) {
            sipSendDTMF( shortcutNumber.charAt(i) );
            await new Promise(r => setTimeout(r, 200));
        }
    } else {
        document.getElementById( 'txtPhoneNumber' ).value = shortcutNumber;
        if ( shortcutAction == 'Audio' ) {
            sipCall("call-audio");
        } else if ( shortcutAction == 'Video' ) {
            sipCall("call-audiovideo");
        } else if ( shortcutAction == 'Screenshare' ) {
            sipShareScreen();
        } else if ( shortcutAction == 'Chat' ) {
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
        window.localStorage.setItem('org.doubango.uiPref.chatVisible', "1");
        msgDiv.style.display = 'block';
        msgDiv.classList.add( 'border-top-separator' );
        msgDiv.classList.add( 'theme-accent-color-border' );
        btnChatShowHide.value = 'Hide Chat';
        btnChatShowHide.setAttribute( 'onclick', 'uiShowHideChat( 0 )' );
        if ( btnChatShowHide.classList.contains( 'btnBlink' ) ) {
            btnChatShowHide.classList.remove( 'btnBlink' );
        }
    } else {
        window.localStorage.setItem('org.doubango.uiPref.chatVisible', "0");
        msgDiv.style.display = 'none';
        msgDiv.classList.remove( 'border-top-separator' );
        msgDiv.classList.remove( 'theme-accent-color-border' );
        window.sessionStorage.setItem( 'org.doubango.chat.activeConv', '' );
        btnChatShowHide.value = 'Show Chat';
        btnChatShowHide.setAttribute( 'onclick', 'uiShowHideChat( 1 )' );
    }
}

// Function to enumerate chat conversations from localstorage object
function chatEnum() {
    msgSession = ( "" == window.sessionStorage.getItem( 'org.doubango.chat.session' ) ? [] : JSON.parse( window.sessionStorage.getItem( 'org.doubango.chat.session' ) ) );
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
                msgConvoEntry.setAttribute( 'class', 'chatListEntry d-flex justify-content-between flex-wrap align-items-center' );
                var msgConvoSel = document.createElement('a');
                msgConvoSel.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color btn-chatName' );
                msgConvoSel.setAttribute( 'id' , 'convo' + msgConversation.contact );
                msgConvoSel.setAttribute( 'href' , '#' );
                msgConvoSel.setAttribute( 'onclick' , 'chatDisplay("' + msgConversation.contact + '");' );
                activeChat = window.sessionStorage.getItem('org.doubango.chat.activeConv');
                msgConvoSel.innerText = msgConversation.displayName;
                var msgConvoSelClose = document.createElement('a');
                msgConvoSelClose.setAttribute( 'class' , 'btn btn-primary btn-sm btn-chatClose theme-accent-color ' );
                msgConvoSelClose.setAttribute( 'id' , 'convo' + msgConversation.contact );
                msgConvoSelClose.setAttribute( 'href' , '#' );
                msgConvoSelClose.setAttribute( 'onclick' , 'chatCloseConvo("' + msgConversation.contact + '");' );
                msgConvoSelClose.innerText = 'X';
                msgConvoListDiv.appendChild( msgConvoEntry );
                msgConvoEntry.appendChild( msgConvoSel );
                msgConvoEntry.appendChild( msgConvoSelClose );
                if ( activeChat != msgConversation.contact && msgConversation.unread == 1 ) {
                    msgConvoSel.classList.add( 'btnBlink' );
                } else if ( activeChat == msgConversation.contact ) {
                    if ( msgConvoSel.classList.contains( 'btnBlink' ) ) {
                        msgConvoSel.classList.remove( 'btnBlink' );
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
        window.sessionStorage.setItem( 'org.doubango.chat.activeConv', msgFrom );
        msgSession = ( "" == window.sessionStorage.getItem( 'org.doubango.chat.session' ) ? [] : JSON.parse( window.sessionStorage.getItem( 'org.doubango.chat.session' ) ) );
        var chatConvDiv = document.getElementById( "chatConversation" );

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
        let msgConversation = msgSession.find( msgConversation => msgConversation.contact === msgFrom );
        if ( typeof msgConversation !== 'undefined' ) {
            // If a conversatione xists, prepare to display it
            messages = msgConversation.messages;
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
        if ( document.getElementById("divChatMessages") != null ) {
            divChatMessages = document.getElementById("divChatMessages");
            divChatMessages.innerHTML = "";
        } else {
            var divChatMessages = document.createElement('div');
            divChatMessages.setAttribute( 'class' , 'overflow-auto' );
            divChatMessages.setAttribute( 'id' , 'divChatMessages' );
            chatConvDiv.appendChild( divChatMessages );
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
                divChatMessages.appendChild( chatMsgLine );
                var chatMsgLineTime = document.createElement('p');
                chatMsgLineTime.setAttribute( 'class' , 'msgLineTime' );
                if ( message.inOut == 1 ) {
                    chatMsgLineTime.setAttribute( 'style' , 'text-align: left;' );
                } else {
                    chatMsgLineTime.setAttribute( 'style' , 'text-align: right;' );
                }
                chatMsgLineTime.innerText = timeConverter( message.timestamp, "short" ) ;
                divChatMessages.appendChild( chatMsgLineTime );
            }
        );
        divChatMessages.scrollTop = divChatMessages.scrollHeight;
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
            chatInput.setAttribute( 'autocomplete', 'off' );
            chatInput.setAttribute( 'name', 'chatMessage' );
            chatConvSend.appendChild( chatInput );
            var chatSendBtn = document.createElement('input');
            chatSendBtn.setAttribute( 'href' , '#' );
            chatSendBtn.setAttribute( 'type' , 'button' );
            chatSendBtn.setAttribute( 'id' , 'chatSendBtn' );
            chatSendBtn.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
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
        window.sessionStorage.setItem('org.doubango.chat.session', JSON.stringify(msgSession));
        chatEnum();
        // Send chat when enter is pressed; 13 is enter key
        chatInput.addEventListener( "keyup", _listener );
        chatInput.focus();
    }
}

// Close and delete a chat conversation
function chatCloseConvo( msgFrom ) {
    msgSession = ( "" == window.sessionStorage.getItem( 'org.doubango.chat.session' ) ? [] : JSON.parse( window.sessionStorage.getItem( 'org.doubango.chat.session' ) ) );
    for ( var i in msgSession ) {
        if ( msgSession[i].contact == msgFrom ) {
            msgSession.splice( i , 1 );
            break; //Stop this loop, we found it!
        }
    }
    window.sessionStorage.setItem('org.doubango.chat.session', JSON.stringify(msgSession));
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
        url: 'includes/saveToDB.php',
        type: 'POST',
        data: {
            action:'saveChat',
            extension:window.sessionStorage.getItem( 'org.doubango.identity.impi' ),
            messages:window.sessionStorage.getItem( 'org.doubango.chat.session' )
        },
        success: function(data) {
            console.log(data); 
        }
    });
}

// Function to publish presence
// Sadly this won't work with asterisk.  They do not support the PUBLISH
//  SIP command, but instead the custom "CustomPresence" attribute.  Sadly
//  this is not supported by sipml5 at this time, and thus will not work.
//  https://community.asterisk.org/t/help-understanding-if-asterisk-can-handle-publish-requests/91983
function sharePresence( presenceSelector ) {
    var presenceStatus = presenceSelector.value;
    if ( oSipStack ) {
        var publishSession;
        oSubscriptionEventListeners[ "MyPresence" ] = function(e){
            console.info('session event = ' + e.type);
        }
        publishSession = oSipStack.newSession('publish', {
            events_listener: { events: '*', listener: oSubscriptionEventListeners[ "MyPresence" ] }
        });
        var contentType = 'application/pidf+xml';
        var content = '<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n' +
                      '<presence xmlns=\"urn:ietf:params:xml:ns:pidf\"\n' +
//                           ' xmlns:im=\"urn:ietf:params:xml:ns:pidf:im\"' +
                           ' entity=\"' + txtPublicIdentity.value + '\">\n' +
                           '<tuple id=\"' + txtPrivateIdentity.value + ';transport=ws\">\n' +
                               '<status>\n'+
                               '   <basic>' + presenceStatus + '</basic>\n' +
//                               '   <im:im>away</im:im>\n' +a
                               '</status>\n' +
                               '<contact priority=\"1\">' + txtPublicIdentity.value + '</contact>\n' +
                           '</tuple>\n' +
                      '</presence>';
        // send the PUBLISH request
        publishSession.publish(content, contentType,{
            expires: 200,
            sip_caps: [
                            { name: '+g.oma.sip-im' },
                            { name: '+sip.ice' },
                            { name: 'language', value: '\"en,fr\"' }
                      ],
            sip_headers: [
                            { name: 'Event', value: 'presence' },
                            { name: 'Organization', value: 'Doubango Telecom, Cloudonix, SEIU Local 1000, surfrock66@surfrock66.com' }
                         ]
        });
    }
}

// Function to send an sms message
function sipMsg( msgFrom ) {
    if ( oSipStack ) {
        // create call session
        msgTimeStamp = Date.now();
        oSipSessionMsg = oSipStack.newSession( 'message' );
        var msgMessage = chatInput.value;
        oSipSessionMsg.send( msgFrom , msgMessage , 'text/plain;charset=utf-8');
        msgSession = ( "" == window.sessionStorage.getItem( 'org.doubango.chat.session' ) ? [] : JSON.parse( window.sessionStorage.getItem( 'org.doubango.chat.session' ) ) );
        maxChatConvoLen = ( "" == window.sessionStorage.getItem( 'org.doubango.chat.max_convo_len' ) ? "" : window.sessionStorage.getItem( 'org.doubango.chat.max_convo_len' ) );
        let msgConversation = msgSession.find( msgConversation => msgConversation.contact === msgFrom );
        let message = {
            "inOut": 0,
            "timestamp": msgTimeStamp,
            "message": msgMessage
        }
        if ( typeof msgConversation !== 'undefined' ) {
            // A conversation exists with this user, add to ita
            if ( maxChatConvoLen != "" && maxChatConvoLen == msgConversation.messages.length ) {
                msgConversation.messages.shift();
            }
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
        window.sessionStorage.setItem('org.doubango.chat.session', JSON.stringify(msgSession));
        chatSave();
        chatDisplay( msgFrom );
    }
}

function loadCallOptions() {
    if (window.sessionStorage) {
        var s_value;
        if ((s_value = window.sessionStorage.getItem('org.doubango.call.phone_number'))) txtPhoneNumber.value = s_value;
        bDisableVideo = (window.sessionStorage.getItem('org.doubango.expert.disable_video') == "true");
        txtCallStatus.innerHTML = '<i>Video ' + (bDisableVideo ? 'disabled' : 'enabled') + '</i>';
    }
}

function saveCallOptions() {
    if (window.sessionStorage) {
        window.sessionStorage.setItem('org.doubango.call.phone_number', txtPhoneNumber.value);
        window.sessionStorage.setItem('org.doubango.expert.disable_video', bDisableVideo ? "true" : "false");
    }
}

function loadCredentials() {
    if (window.sessionStorage) {
        var s_value;
        if ((s_value = window.sessionStorage.getItem('org.doubango.identity.display_name'))) txtDisplayName.value = s_value;
        if ((s_value = window.sessionStorage.getItem('org.doubango.identity.impi'))) txtPrivateIdentity.value = s_value;
        if ((s_value = window.sessionStorage.getItem('org.doubango.identity.impu'))) txtPublicIdentity.value = s_value;
        if ((s_value = window.sessionStorage.getItem('org.doubango.identity.password'))) txtPassword.value = s_value;
        // 2020.12.10 - Edit by jgullo - Removed as it's set from the global config
        //if ((s_value = window.sessionStorage.getItem('org.doubango.identity.realm'))) txtRealm.value = s_value;
    }
    else {
        // Set default values if you must, though this is no longer used
    }
};

function saveCredentials() {
    if (window.sessionStorage) {
        window.sessionStorage.setItem('org.doubango.identity.display_name', txtDisplayName.value);
        window.sessionStorage.setItem('org.doubango.identity.impi', txtPrivateIdentity.value);
        window.sessionStorage.setItem('org.doubango.identity.impu', txtPublicIdentity.value);
        window.sessionStorage.setItem('org.doubango.identity.password', txtPassword.value);
        // 2020.12.10 - Edit by jgullo - Removed as it's set from the global config
        //window.sessionStorage.setItem('org.doubango.identity.realm', txtRealm.value);
    }
};

// Send a notification to the user
// Takes 5 params:
//  notifyTitle - Title of the notification
//  notifyText - Body content of the notification
//  notifyTimeout - Duration of the notification in seconds
//  notifyAction - What should clicking the notification do?
//  notifyReplyTo - If we need to know who caused the notification, pass it.
function sipNotify( notifyTitle, notifyText, notifyTimeout, notifyAction, notifyReplyTo ) {
    if ( notifyTimeout === undefined ) notifyTimeout = 6;
    if ( ! document.hasFocus() ) {
        if (!window.Notification || iOS() ) {
            console.log('Browser does not support notifications.');
        } else {
            console.log('Browser supports notifications.');
            // check if permission is already granted
            if (Notification.permission === 'granted') {
                var notificationObj = new Notification( notifyTitle , {
                    body: notifyText,
                    icon: '/images/icons/favicon.ico',
                });
                setTimeout(() => {
                    notificationObj.close();
                }, notifyTimeout * 1000);
                // Perform action when clicked
                notificationObj.addEventListener('click', () => {
                    window.focus(); 
                    if ( notifyAction !== undefined ) {
                        if ( notifyAction == "Audio" ) {
                            sipCall( 'call-audio' );
                        } else if ( notifyAction == "Video" ) {
                            sipCall( 'call-audiovideo' );
                        } else if ( notifyAction == "Chat" ) {
                            uiShowHideChat( 1 );
                            btnChatShowHide.disabled = false;
                            chatDisplay( notifyReplyTo );
                        }
                    }
                    this.close();
                });
            } else {
                console.log('User blocked notifications.');
            }
        }
    }
}
    
// sends SIP REGISTER request to login
async function sipRegister() {
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

        if (!window.Notification || iOS() ) {
            console.log('Browser does not support notifications.');
        } else {
            console.log('Browser supports notifications.');
            let permission = await Notification.requestPermission();
        }
        // 2021.01.20 - Edit by jgullo - Adding initialization for chat array variable.
        let msgSession = [];
        if ( window.sessionStorage ) {
            if ( sessionStorage.getItem( 'org.doubango.chat.session' ) === null ) {
                window.sessionStorage.setItem( 'org.doubango.chat.session', JSON.stringify( msgSession ) );
            }
        }

        // save credentials
        saveCredentials();

        // update debug level to be sure new values will be used if the user haven't updated the page
        SIPml.setDebugLevel((window.sessionStorage && window.sessionStorage.getItem('org.doubango.expert.disable_debug') == "true") ? "error" : "info");

        // create SIP stack
        oSipStack = new SIPml.Stack({
            // 2020.12.10 - Edit by jgullo - Edited to pull the value from the config and not from the form
            realm: (window.sessionStorage ? window.sessionStorage.getItem('org.doubango.identity.realm') : null),
            impi: txtPrivateIdentity.value,
            impu: txtPublicIdentity.value,
            password: txtPassword.value,
            display_name: txtDisplayName.value,
            websocket_proxy_url: (window.sessionStorage ? window.sessionStorage.getItem('org.doubango.expert.websocket_server_url') : null),
            outbound_proxy_url: (window.sessionStorage ? window.sessionStorage.getItem('org.doubango.expert.sip_outboundproxy_url') : null),
            ice_servers: (window.sessionStorage ? window.sessionStorage.getItem('org.doubango.expert.ice_servers') : null),
            enable_rtcweb_breaker: (window.sessionStorage ? window.sessionStorage.getItem('org.doubango.expert.enable_rtcweb_breaker') == "true" : false),
            events_listener: { events: '*', listener: onSipEventStack },
            enable_early_ims: (window.sessionStorage ? window.sessionStorage.getItem('org.doubango.expert.disable_early_ims') != "true" : true), // Must be true unless you're using a real IMS network
            enable_media_stream_cache: (window.sessionStorage ? window.sessionStorage.getItem('org.doubango.expert.enable_media_caching') == "true" : false),
            bandwidth: (window.sessionStorage ? tsk_string_to_object(window.sessionStorage.getItem('org.doubango.expert.bandwidth')) : null), // could be redefined a session-level
            video_size: (window.sessionStorage ? tsk_string_to_object(window.sessionStorage.getItem('org.doubango.expert.video_size')) : null), // could be redefined a session-level
            sip_headers: [
                { name: 'User-Agent', value: 'IM-client/OMA1.0 sipML5-ng-L1KMakes-v1.2021.02' },
                { name: 'Organization', value: 'Doubango Telecom, Cloudonix, SEIU Local 1000, surfrock66@surfrock66.com' }
            ]
        }
        );
        if (oSipStack.start() != 0) {
            txtRegStatus.innerHTML = '<img src="images/reg-status-disconnected.png" height="24" /><b>Failed to start the SIP stack</b>';
        }
        else  {
            // Hide the side-panel upon registration
            $(".screen-overlay").removeClass("show");
            $(".offcanvas").removeClass("show");
            $("body").removeClass("offcanvas-active");

            // If there are chats stored in the local session, load them
            chatEnum();
            msgSession = ( "" == window.sessionStorage.getItem( 'org.doubango.chat.session' ) ? [] : JSON.parse( window.sessionStorage.getItem( 'org.doubango.chat.session' ) ) );
            var btnChatShowHide = document.getElementById( 'btnChatShowHide' );
            if ( msgSession.length == 0 ) {
                uiShowHideChat( 0 );
                btnChatShowHide.disabled = true;
            } 
            else {
                if ( "0" == window.localStorage.getItem( 'org.doubango.uiPref.chatVisible' ) ) {
                    uiShowHideChat( 0 );
                } 
                else {
                    uiShowHideChat( 1 );
                }
                btnChatShowHide.disabled = false;
            }

            // Display History
            historyEnum();
            if ( "0" == window.localStorage.getItem( 'org.doubango.uiPref.historyVisible' ) ) {
                uiShowHideHistory( 0 );
            } 
            else {
                uiShowHideHistory( 1 );
            }

            // Display KeyPad
            if ( "0" == window.localStorage.getItem( 'org.doubango.uiPref.keypadVisible' ) ) {
                uiShowHideKeyPad( 0 );
            } 
            else {
                uiShowHideKeyPad( 1 );
            }
            document.addEventListener( "keyup", globalKeyPadListener );
            btnRegister.disabled = false;
            return;
        }
    }
    catch (e) {
        txtRegStatus.innerHTML = '<img src="images/reg-status-disconnected.png" height="24" /><b>2:' + e + '</b>';
    }
}

// sends SIP REGISTER (expires=0) to logout
function sipUnRegister() {
    if (oSipStack) {
        oSipStack.stop(); // shutdown all sessions
    }
}

// makes a call (SIP INVITE)
function sipCall(s_type) {
    callListDiv = document.getElementById('divCallList');
    // If a video or screen share call is starting, draw the video UI
    if ( s_type == 'call-audiovideo' || s_type == 'call-screenshare' ) {
        // Video call, so show remote video, show local video, hide local screenshare
        uiVideoElementDraw( 1, 1 );

        if (window.sessionStorage) {
            oConfigCall.bandwidth = tsk_string_to_object(window.sessionStorage.getItem('org.doubango.expert.bandwidth')); // already defined at stack-level but redifined to use latest values
            oConfigCall.video_size = tsk_string_to_object(window.sessionStorage.getItem('org.doubango.expert.video_size')); // already defined at stack-level but redifined to use latest values
        }

        videoLocal = document.getElementById("video_local");
        videoRemote = document.getElementById("video_remote");
        oConfigCall.video_local = document.getElementById("video_local");
        oConfigCall.video_remote = document.getElementById("video_remote");
    }
    if (oSipStack && !oSipSessionCall && !tsk_string_is_null_or_empty(txtPhoneNumber.value)) {
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
        btnAudio.disabled = true;
        btnVideo.disabled = true;
        btnScreenShare.disabled = true;
        btnHangUp.disabled = false;
        historyAppendLog( "Outgoing", s_type, Date.now(), txtPhoneNumber.value, "" );
        
        // Add call list entry
        var callButton = document.createElement('input');
        callButton.setAttribute( 'type', 'button' );
        callButton.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
        callButton.setAttribute( 'id', 'callButton' + txtPhoneNumber.value );
        callButton.setAttribute( 'value', txtPhoneNumber.value );
        callButton.setAttribute( 'onclick' , '' );
        callListDiv.appendChild( callButton );

        // create call session
        oSipSessionCall = oSipStack.newSession(s_type, oConfigCall);
        // make call
        var internalExtMaxLen = window.sessionStorage.getItem('org.doubango.internal_ext_max_length')
        internalExtMaxLen = ( "" == window.sessionStorage.getItem( 'org.doubango.internal_ext_max_length' ) ? "" : window.sessionStorage.getItem( 'org.doubango.internal_ext_max_length' ) );
        dialoutPrefix = ( "" == window.sessionStorage.getItem( 'org.doubango.dialout_prefix' ) ? "" : window.sessionStorage.getItem( 'org.doubango.dialout_prefix' ) );
        var validChars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#'];
        var numberToDial = txtPhoneNumber.value.replace(new RegExp(`[^${validChars.join('')}]`, 'g'), '');
        if ( internalExtMaxLen == null || dialoutPrefix == null ) {
            callResult = oSipSessionCall.call(numberToDial);
        } else {
            if ( numberToDial.length > internalExtMaxLen ) {
                if ( numberToDial.length == 10 || numberToDial.length == 7 ) {
                    callResult = oSipSessionCall.call(dialoutPrefix + numberToDial);
                }
                else if ( numberToDial.length == 11 && numberToDial.charAt(0) == "1" ) {
                    callResult = oSipSessionCall.call(dialoutPrefix + numberToDial);
                }
                else {
                    callResult = oSipSessionCall.call(numberToDial);
                }
            } else {
                callResult = oSipSessionCall.call(numberToDial);
            }
        }
        //if (oSipSessionCall.call(txtPhoneNumber.value) != 0) {
        if ( callResult != 0) {
            oSipSessionCall = null;
            txtCallStatus.value = 'Failed to make call';
            btnAudio.disabled = false;
            btnVideo.disabled = ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false );
            btnScreenShare.disabled = ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false );
            btnChat.disabled = false;
            btnHangUp.disabled = true;
            return;
        }
        saveCallOptions();
    }
    else if (oSipSessionCall) {
        // Answer an incoming call
        txtCallStatus.innerHTML = '<i>Connecting...</i>';
        if ( btnAudio.classList.contains( 'btnBlink' ) ) {
            btnAudio.classList.remove( 'btnBlink' );
        }
        if ( btnVideo.classList.contains( 'btnBlink' ) ) {
            btnVideo.classList.remove( 'btnBlink' );
        }
        if ( btnHangUp.classList.contains( 'btnBlink' ) ) {
            btnHangUp.classList.remove( 'btnBlink' );
        }
        btnAudio.disabled = false;
        btnVideo.disabled = ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false );
        btnScreenShare.disabled = ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false );

        // Add call list entry
        var callButton = document.createElement('input');
        callButton.setAttribute( 'type', 'button' );
        callButton.setAttribute( 'class' , 'btn btn-primary btn-sm theme-accent-color ' );
        callButton.setAttribute( 'id', 'callButton' + oSipSessionCall.o_session.o_uri_from.s_user_name );
        callButton.setAttribute( 'value', oSipSessionCall.o_session.o_uri_from.s_user_name );
        callButton.setAttribute( 'onclick' , '' );
        callListDiv.appendChild( callButton );

        historyAppendLog( "Incoming", s_type, Date.now(), oSipSessionCall.o_session.o_uri_from.s_user_name, oSipSessionCall.o_session.o_uri_from.s_display_name );
        oSipSessionCall.accept(oConfigCall);
    }
}

// Handles all Call Waiting and Multi-Line Functions
//  None of the code in this app is natively asynchronous, 
//   so as a result the idea of waiting is shoehorned in.
//   to accommodate this, we are using some global variables 
//   to attempt to track state.  This is kind of a hack but 
//   should work; the main issue is some things complete or
//   are set in a race condition with when they are consumed, 
//   and as a result we must add some delay using setTimeout.
function sipCallWaiting( s_type ) {
console.log("DEBUG - CALLWAITING");
console.log("bSwitchingCalls: " + bSwitchingCalls );
console.log("bHeldCallPendingHangup: " + bHeldCallPendingHangup);
    var myExt = window.sessionStorage.getItem( 'org.doubango.identity.impi' );
    if ( oSipSessionCall ) {
        var i_ret;
        switch ( bSwitchingCalls ) {
            case 'holdComplete':
                {
console.log("callWaiting - holdComplete");
                    if ( bHeldCallPendingHangup != "hangUpHeldCall" ) {
console.log("callWaiting - holdComplete - bHeldCallPendingHangup != hangUpHeldCall");
                        if ( myExt == oSipSessionCall.o_session.o_uri_from.s_user_name ) {
                            var callButton = document.getElementById( 'callButton' + oSipSessionCall.o_session.o_uri_to.s_user_name );
                        }
                        else {
                            var callButton = document.getElementById( 'callButton' + oSipSessionCall.o_session.o_uri_from.s_user_name );
                        }
                        callButton.classList.add( 'btnBlink' );
                        callButton.setAttribute( 'onclick', 'sipCallWaiting(' + "\"s_type\"" + ')' );
console.log("old call oSipSessionCall.bheld: " + oSipSessionCall.bheld );
                        var oSipSessionCallTemp = oSipSessionCall;
                        oSipSessionCall = oSipSessionHeldCall;
                        oSipSessionHeldCall = oSipSessionCallTemp;
                        oSipSessionCallTemp = null;
console.log("new call oSipSessionCall.bheld: " + oSipSessionCall.bheld );
                        if ( myExt == oSipSessionCall.o_session.o_uri_from.s_user_name ) {
                            var callButton = document.getElementById( 'callButton' + oSipSessionCall.o_session.o_uri_to.s_user_name );
                        }
                        else {
                            var callButton = document.getElementById( 'callButton' + oSipSessionCall.o_session.o_uri_from.s_user_name );
                        }
                        if ( callButton.classList.contains( 'btnBlink' ) ) {
                            callButton.classList.remove( 'btnBlink' );
                        }
                        callButton.setAttribute( 'onclick', '' );
console.log("Call Waiting: oSipSessionCall.bHeld: " + oSipSessionCall.bHeld );
                        if ( oSipSessionCall.bHeld ) {
                            bSwitchingCalls = "waitingResume";
                            setTimeout(function() {
                                i_ret = oSipSessionCall.resume();
                                if (i_ret != 0) {
                                    txtCallStatus.innerHTML = '<i>Call switch failed; Second call did not resume!</i>';
                                    return;
                                }
                            }, 350);
                        }
                        else {
                            bSwitchingCalls = "waitingAccept";
                            setTimeout(function() {
                                i_ret = oSipSessionCall.accept(oConfigCall);
                                if (i_ret != 0) {
                                    txtCallStatus.innerHTML = '<i>Call switch failed; Second call did not answer!</i>';
                                   return;
                                }
                            }, 350);
                            historyAppendLog( "Incoming", s_type, Date.now(), oSipSessionCall.o_session.o_uri_from.s_user_name, oSipSessionCall.o_session.o_uri_from.s_display_name );
                        }
                    }
                    break;
                }
            case 'acceptComplete' : case 'resumeComplete' : 
                {
console.log("callWaiting - accept/resumeComplete");
//if ( bHeldCallPendingHangup != "holdActiveCall") {
                    bSwitchingCalls = "waitingFixHold";
                    setTimeout(function() {
                        i_ret = oSipSessionCall.hold();
                        if (i_ret != 0) {
                            txtCallStatus.innerHTML = '<i>Call switch failed; main call did not hold!</i>';
                            return;
                        }
                    }, 350);
//} else if ( bHeldCallPendingHangup == "holdActiveCall" ) {
//    bSwitchingCalls = false;
//    bHeldCallPendingHangup = "hangUpHeldCall";
//    sipCallWaiting( s_type );
//}
                    break;
                }
            case 'fixHoldComplete' :
                {
console.log("callWaiting - fixHoldComplete");
                    bSwitchingCalls = "waitingFixResume";
                    setTimeout(function() {
                        i_ret = oSipSessionCall.resume();
                        if (i_ret != 0) {
                            txtCallStatus.innerHTML = '<i>Call switch failed; Second call did not resume!</i>';
                            return;
                        }
                    }, 350);
                    break;
                }
            case 'fixResumeComplete' :
                {
console.log("callWaiting - fixResumeComplete");
                    bSwitchingCalls = false;
                    if ( bHeldCallPendingHangup == "holdActiveCall" ) {
                        bHeldCallPendingHangup = "hangUpHeldCall";
                        sipCallWaiting( s_type );
                    } else {
                        txtCallStatus.innerHTML = '<i>Active call switched!</i>';
                    }
                    break;
                }
            default :
                {
console.log("callWaiting - default");
                    if ( bHeldCallPendingHangup == "hangUpHeldCall" ) {
                        oSipSessionHeldCall.hangup();
                        txtCallStatus.innerHTML = '<i>Call successfully hung up, second call is active!</i>';
                    } else if ( bHeldCallPendingHangup != "hangUpHeldCall" ) {
console.log("callWaiting - default - bHeldCallPendingHangup != hangUpHeldCall");
                        txtCallStatus.innerHTML = '<i>Switching calls...</i>';
                        if ( ! oSipSessionCall.bHeld ) {
                            bSwitchingCalls = "waitingHold";
                            i_ret = oSipSessionCall.hold();
                            if (i_ret != 0) {
                                txtCallStatus.innerHTML = '<i>Call switch failed; First call did not hold!</i>';
                                return;
                            }
                        }
                    }
                }
        }
    }
console.log("bSwitchingCalls End of CallWaiting: " + bSwitchingCalls );
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
    if ( oSipSessionCall ) {
        var i_ret;
        btnHoldResume.disabled = true;
        if ( oSipSessionCall.bHeld ) {
            txtCallStatus.innerHTML = '<i>Resuming the call...</i>';
            i_ret = oSipSessionCall.resume();
        }
        else {
            txtCallStatus.innerHTML = '<i>Holding the call...</i>';
            i_ret = oSipSessionCall.hold();
        }
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
console.log("sipHangUp - bHeldCallPendingHangup: " + bHeldCallPendingHangup);
console.log(oSipSessionCall);
console.log(oSipSessionHeldCall);
    if (oSipSessionCall) {
        txtCallStatus.innerHTML = '<i>Terminating the call...</i>';
        if ( oSipSessionHeldCall ) {
            // This is a handoff as the call waiting function handles all the switch and hangup work
console.log("Debug: hanging up main call");
            bHeldCallPendingHangup = "holdActiveCall";
            sipCallWaiting(); 
        } else {
            var callButtonIncoming = document.getElementById('callButton' + oSipSessionCall.o_session.o_uri_from.s_user_name );
            var callButtonOutgoing = document.getElementById('callButton' + txtPhoneNumber.value );
            if ( callButtonIncoming ) {
                divCallList.removeChild( callButtonIncoming );
            }
            else if ( callButtonOutgoing ) {
                divCallList.removeChild( callButtonOutgoing );
            }
            oSipSessionCall.hangup({ events_listener: { events: '*', listener: onSipEventSession } });
            if ( btnAudio.classList.contains( 'btnBlink' ) ) {
                btnAudio.classList.remove( 'btnBlink' );
            }
            if ( btnVideo.classList.contains( 'btnBlink' ) ) {
                btnVideo.classList.remove( 'btnBlink' );
            }
            if ( btnHangUp.classList.contains( 'btnBlink' ) ) {
                btnHangUp.classList.remove( 'btnBlink' );
            }
            btnAudio.disabled = false;
            btnVideo.disabled = ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false );
            btnScreenShare.disabled = ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false );
        }
    }
}

function globalKeyPadListener( event ) {
    key = event.keyCode;
    dialerInput = document.getElementById( 'txtPhoneNumber' );
    // Translated to keyPadKeys([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, *, #, Enter, numpad0, numpad1, numpad2, numpad3, numpad4, numpad5, numpad6, numpad7, numpad8, numpad9, numpad*, backspace, delete]);
    const keyPadKeys = new Set([48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 170, 163, 13, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 8, 46]);
    //if ( "0" == window.localStorage.getItem( 'org.doubango.uiPref.chatVisible' ) ) {
    if ( ! ( "INPUT" == document.activeElement.tagName && "text" == document.activeElement.type ) ) {
        if ( keyPadKeys.has( key ) ) {
            if ( key == "48" || key == "96" ) {
                dialerInput.value = dialerInput.value + "0";
                sipSendDTMF( "0" );
            }
            else if ( key == "49" || key == "97" ) {
                dialerInput.value = dialerInput.value + "1";
                sipSendDTMF( "1" );
            }
            else if ( key == "50" || key == "98" ) {
                dialerInput.value = dialerInput.value + "2";
                sipSendDTMF( "2" );
            }
            else if ( key == "51" || key == "99" ) {
                dialerInput.value = dialerInput.value + "3";
                sipSendDTMF( "3" );
            }
            else if ( key == "52" || key == "100" ) {
                dialerInput.value = dialerInput.value + "4";
                sipSendDTMF( "4" );
            }
            else if ( key == "53" || key == "101" ) {
                dialerInput.value = dialerInput.value + "5";
                sipSendDTMF( "5" );
            }
            else if ( key == "54" || key == "102" ) {
                dialerInput.value = dialerInput.value + "6";
                sipSendDTMF( "6" );
            }
            else if ( key == "55" || key == "103" ) {
                dialerInput.value = dialerInput.value + "7";
                sipSendDTMF( "7" );
            }
            else if ( key == "56" || key == "104" ) {
                dialerInput.value = dialerInput.value + "8";
                sipSendDTMF( "8" );
            }
            else if ( key == "57" || key == "105" ) {
                dialerInput.value = dialerInput.value + "9";
                sipSendDTMF( "9" );
            }
            else if ( key == "170" || key == "106" ) {
                dialerInput.value = dialerInput.value + "*";
                sipSendDTMF( "*" );
            }
            else if ( key == "163" ) {
                dialerInput.value = dialerInput.value + "#";
                sipSendDTMF( "#" );
            }
            else if ( key == "13" ) {
                sipCall( "call-audio" );
            }
            else if ( key == "8" || key == "46" ) {
                dialerInput.value = dialerInput.value.slice(0, -1);
            }
        }
    }
}

function keyPadButton( c ) {
    currentNumber = document.getElementById( 'txtPhoneNumber' ).value;
    document.getElementById( 'txtPhoneNumber' ).value = currentNumber + c;
    sipSendDTMF( c );
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
    if ( document.fullscreenEnabled ) {
        if ( document.fullscreenElement ) {
            fullScreen( false ); 
        } else {
            fullScreen( true );
        }
    }
}

function fullScreen(b_fs) {
    bFullScreen = b_fs;
    if ( tsk_utils_have_webrtc4native() && bFullScreen && document.fullscreenEnabled ) {
        if (bFullScreen) {
            videoRemote.requestFullscreen().catch(err => {
                alert('Error attempting to enable full-screen mode: ${err.message} (${err.name})i');
            });
        }
        else {
            document.exitFullscreen();
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

function onKeyUp(evt) {
    evt = (evt || window.event);
    if (evt.keyCode == 27) {
        fullScreen(false);
    }
    else if (evt.ctrlKey && evt.shiftKey) { // CTRL + SHIFT
        if (evt.keyCode == 65 || evt.keyCode == 86) { // A (65) or V (86)
            bDisableVideo = (evt.keyCode == 65);
            txtCallStatus.innerHTML = '<i>Video ' + (bDisableVideo ? 'disabled' : 'enabled') + '</i>';
            window.sessionStorage.setItem('org.doubango.expert.disable_video', bDisableVideo);
        }
    }
}

function onDivCallCtrlMouseMove(evt) {
    try { // IE: DOM not ready
        if (tsk_utils_have_stream()) {
            btnAudio.disabled = (!tsk_utils_have_stream() || !oSipSessionRegister || !oSipSessionRegister.is_connected());
            btnVideo.disabled = (!tsk_utils_have_stream() || !oSipSessionRegister || !oSipSessionRegister.is_connected()) || window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || window.sessionStorage.getItem('org.doubango.expert.disable_video');
            btnScreenShare.disabled = (!tsk_utils_have_stream() || !oSipSessionRegister || !oSipSessionRegister.is_connected()) || window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || window.sessionStorage.getItem('org.doubango.expert.disable_video');
            btnChat.disabled = (!tsk_utils_have_stream() || !oSipSessionRegister || !oSipSessionRegister.is_connected());
            document.getElementById("divCallCtrl").onmousemove = null; // unsubscribe
        }
    }
    catch (e) { }
}

function uiOnConnectionEvent(b_connected, b_connecting) { // should be enum: connecting, connected, terminating, terminated
    btnRegister.disabled = b_connected || b_connecting;
    btnUnRegister.disabled = !b_connected && !b_connecting;
    btnAudio.disabled = !(b_connected && tsk_utils_have_webrtc() && tsk_utils_have_stream()); 
    btnVideo.disabled = !(b_connected && tsk_utils_have_webrtc() && tsk_utils_have_stream()) || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video');
    btnScreenShare.disabled = !(b_connected && tsk_utils_have_webrtc() && tsk_utils_have_stream()) || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video');
    btnChat.disabled = !(b_connected && tsk_utils_have_webrtc() && tsk_utils_have_stream());
    btnHangUp.disabled = !oSipSessionCall;
}

// 2 Params to draw the video elements:
//  rv_show - Remote Video show flag, 0=hide, 1=show, 2=no change
//  lvv_show - Loval Video Camera show flag, 0=hide, 1=show, 2=no change
function uiVideoElementDraw( rv_show, lv_show ) {
    var divCallWrapper = document.getElementById( 'divCallWrapper' );
    var divVideo = document.getElementById( 'divVideo' );
    var divVideoRemoteWrapper = document.getElementById( 'divVideoRemoteWrapper' );
    var divVideoLocalWrapper = document.getElementById( 'divVideoLocalWrapper' );
    if ( rv_show == 0 && lv_show == 0 ) {
        // If we're hiding everything, clear the 3 divs and set the parent div to 0 height
        divCallWrapper.classList.remove( 'border-top-separator' );
        divCallWrapper.classList.remove( 'theme-accent-color-border' );
        divVideoRemoteWrapper.innerHTML = '';
        divVideoLocalWrapper.innerHTML = '';
        divVideo.style.height = '0px';
        btnFullScreen.disabled = true;
    } else {
        divCallWrapper.classList.add( 'border-top-separator' );
        divCallWrapper.classList.add( 'theme-accent-color-border' );
        divVideo.style.height = null;
        divVideo.style.minheight = '340px';
        if ( rv_show == 1 ) {
            // Draw elements for Remote Video
            var videoRemoteElement = document.getElementById( 'video_remote' );
            if ( videoRemoteElement == null ) {
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
            // Hide elements for Remote Video
            divVideoRemoteWrapper.innerHTML = '';
            btnFullScreen.disabled = true;
        }
        if ( lv_show == 1 ) {
            // Draw elements for Local Camera Video
            var divVideoLocal = document.getElementById( 'divVideoLocal' );
            if ( divVideoLocal == null ) {
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
}

function uiDisableCallOptions() {
    if (window.sessionStorage) {
        window.sessionStorage.setItem('org.doubango.expert.disable_callbtn_options', 'true');
        btnVideo.disabled = 'true';
        btnScreenShare.disabled = 'true';
        alert('Use expert view to enable the options again (/!\\requires re-loading the page)');
    }
}

function uiCallTerminated(s_description) {
    btnHangUp.title = 'Hang Up';
    btnHoldResume.value = 'Hold';
    btnMute.value = "Mute";
    btnAudio.disabled = false;
    btnVideo.disabled = ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false );
    btnScreenShare.disabled = ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false );
    btnChat.disabled = false;
    btnHangUp.disabled = true;
    if (window.btnBFCP) window.btnBFCP.disabled = true;

    oSipSessionCall = null;

    stopRingbackTone();
    stopRingTone();

    txtCallStatus.innerHTML = "<i>" + s_description + "</i>";
    // Hide the video element
    uiVideoElementDraw( 0, 0 );
    divCallWrapper.classList.remove( 'border-top-separator' );
    divCallWrapper.classList.remove( 'theme-accent-color-border' );
    divCallOptions.style.display = 'none';
    divCallList.style.display = 'none';

    if (oNotifICall) {
        oNotifICall.cancel();
        oNotifICall = null;
    }
    setTimeout(function () { if (!oSipSessionCall) txtCallStatus.innerHTML = ''; }, 2500);
}

// Callback function for SIP Stacks
function onSipEventStack(e /*SIPml.Stack.Event*/) {
console.log("DEBUG00 - onSipEventStack");
console.log(e);
console.log(oSipStack);
console.log("oSipSessionCall");
console.log(oSipSessionCall);
console.log("oSipSessionHeldCall");
console.log(oSipSessionHeldCall);
console.log("bSwitchingCalls: " + bSwitchingCalls );
    tsk_utils_log_info('==stack event = ' + e.type);
    switch (e.type) {
        case 'started':
            {
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
                var bFailure = (e.type == 'failed_to_start') || (e.type == 'failed_to_stop');
                oSipStack = null;
                oSipSessionRegister = null;
                oSipSessionCall = null;

                uiOnConnectionEvent(false, false);

                stopRingbackTone();
                stopRingTone();

                uiVideoElementDraw( 0, 0 );
                divCallWrapper.classList.remove( 'border-top-separator' );
                divCallWrapper.classList.remove( 'theme-accent-color-border' );
                divCallOptions.style.display = 'none';
                divCallList.style.display = 'none';

                txtCallStatus.innerHTML = '';
                txtRegStatus.innerHTML = bFailure ? '<img src="images/reg-status-disconnected.png" height="24" /><i>Disconnected: <b>' + e.description + '</b></i>' : '<img src="images/reg-status-disconnected.png" height="24" /><i>Disconnected</i>';
                break;
            }

        case 'i_new_call':
            {
                if (oSipSessionCall) {
                    if ( "true" == window.sessionStorage.getItem( 'org.doubango.expert.enable_multi_line' ) ) {
                        // Add Call List Entry
                        var callButton = document.createElement('input');
                        callButton.setAttribute( 'type', 'button' );
                        callButton.setAttribute( 'class' , 'btn btn-primary btn-sm btnBlink theme-accent-color ' );
                        callButton.setAttribute( 'id', 'callButton' + e.newSession.o_session.o_uri_from.s_user_name );
                        callButton.setAttribute( 'value', e.newSession.o_session.o_uri_from.s_user_name );
                        incomingCallType = e.o_event.o_session.media.e_type.s_name;
                        if ( incomingCallType == "audio" ) {
                            callButton.setAttribute( 'onclick' , 'sipCallWaiting("call-audio");' );
                            sipNotify( "Incoming Audio Call!", "Incoming audio call from " + sRemoteNumber, 20, "Audio", sRemoteNumber );
                            txtCallStatus.innerHTML = "<i>Incoming audio call from [<b>" + sRemoteNumber + "</b>]</i>";
                        } else if ( incomingCallType == "audio/video" ) {
                            callButton.setAttribute( 'onclick' , 'sipCallWaiting("call-audiovideo");' );
                            sipNotify( "Incoming Video Call!", "Incoming video call from " + sRemoteNumber, 20, "Video", sRemoteNumber );
                            txtCallStatus.innerHTML = "<i>Incoming video call from [<b>" + sRemoteNumber + "</b>]</i>";
                        }
                        callListDiv.appendChild( callButton );
                        oSipSessionHeldCall = e.newSession;
                        startRingTone();
                    }
                    else {
                        // do not accept the incoming call if we're already 'in call'
                        e.newSession.hangup(); // comment this line for multi-line support
                        divGlassPanel.style.visibility = 'hidden';
                    }

                }
                else {
                    oSipSessionCall = e.newSession;
                    // start listening for events
                    oSipSessionCall.setConfiguration(oConfigCall);
                    incomingCallType = e.o_event.o_session.media.e_type.s_name;
                    var sRemoteNumber = (oSipSessionCall.getRemoteFriendlyName() || 'unknown');
                    if ( incomingCallType == 'audio' ) {
                        btnAudio.disabled = false;
                        btnAudio.classList.add( 'btnBlink' );
                        btnVideo.disabled = true;
                        btnScreenShare.disabled = true;
                        sipNotify( "Incoming Audio Call!", "Incoming audio call from " + sRemoteNumber, 20, "Audio", sRemoteNumber );
                        txtCallStatus.innerHTML = "<i>Incoming audio call from [<b>" + sRemoteNumber + "</b>]</i>";
                    } else if ( incomingCallType == 'audio/video' ) {
                        btnVideo.disabled = false;
                        btnVideo.classList.add( 'btnBlink' );
                        btnAudio.disabled = true;
                        btnScreenShare.disabled = true;
                        sipNotify( "Incoming Video Call!", "Incoming video call from " + sRemoteNumber, 20, "Video", sRemoteNumber );
                        txtCallStatus.innerHTML = "<i>Incoming video call from [<b>" + sRemoteNumber + "</b>]</i>";
                    }
                    txtPhoneNumber.value = '';
                    btnHangUp.title = 'Reject';
                    btnHangUp.classList.add( 'btnBlink' );
                    btnScreenShare.disabled = false;
                    btnChat.disabled = false;
                    btnHangUp.disabled = false;

                    startRingTone();

                }
                break;
            }

        case 'm_permission_requested':
            {
                divGlassPanel.style.visibility = 'visible';
                break;
            }
        case 'm_permission_accepted':
        case 'm_permission_refused':
            {
                divGlassPanel.style.visibility = 'hidden';
                if (e.type == 'm_permission_refused') {
                    if ( btnAudio.classList.contains( 'btnBlink' ) ) {
                        btnAudio.classList.remove( 'btnBlink' );
                    }
                    if ( btnVideo.classList.contains( 'btnBlink' ) ) {
                        btnVideo.classList.remove( 'btnBlink' );
                    }
                    if ( btnHangUp.classList.contains( 'btnBlink' ) ) {
                        btnHangUp.classList.remove( 'btnBlink' );
                    }
                    btnAudio.disabled = false;
                    btnVideo.disabled = ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false );
                    btnScreenShare.disabled = ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false );
                    uiCallTerminated('Media stream permission denied');
                }
                break;
            }
        case 'i_new_message':
            {
                activeChat = window.sessionStorage.getItem( 'org.doubango.chat.activeConv' );
                msgFrom = e.o_event.o_message.o_hdr_From.o_uri.s_user_name;
                msgFromDisplay = e.o_event.o_message.o_hdr_From.s_display_name;
                msgTimeStamp = Date.now();
                msgTimeDate = new Date(msgTimeStamp);
                msgTimeString = msgTimeDate.toLocaleString()
                msgMessage = e.getContentString();
                msgSession = ( "" == window.sessionStorage.getItem( 'org.doubango.chat.session' ) ? [] : JSON.parse( window.sessionStorage.getItem( 'org.doubango.chat.session' ) ) );
                maxChatConvoLen = ( "" == window.sessionStorage.getItem( 'org.doubango.chat.max_convo_len' ) ? "" : window.sessionStorage.getItem( 'org.doubango.chat.max_convo_len' ) );
                let msgConversation = msgSession.find( msgConversation => msgConversation.contact === msgFrom );
                let message = {
                    "inOut": 1,
                    "timestamp": msgTimeStamp,
                    "message": msgMessage
                }
                if ( typeof msgConversation !== 'undefined' ) {
                    // A conversation exists with this user, add to it
                    if ( maxChatConvoLen != "" && maxChatConvoLen == msgConversation.messages.length ) {
                        msgConversation.messages.shift();
                    }
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
                window.sessionStorage.setItem('org.doubango.chat.session', JSON.stringify(msgSession));    
                var msgDiv = document.getElementById( 'divChat' );
                var btnChatShowHide = document.getElementById( 'btnChatShowHide' );
                if ( window.getComputedStyle( msgDiv ).display === "none" ) {
                    btnChatShowHide.classList.add( 'btnBlink' );
                }
                chatEnum();
                if ( activeChat == msgFrom ) {
                    chatDisplay( msgFrom );
                }
                chatSave();
                sipNotify( "New chat message", "New message from " + msgFrom, 5, "Chat", msgFrom );
                break;
            }
        case 'starting': default: break;
    }
};

// Callback function for SIP sessions (INVITE, REGISTER, MESSAGE...)
function onSipEventSession(e /* SIPml.Session.Event */) {
console.log("DEBUG00 - onSipEventSession");
console.log(e);
console.log(oSipStack);
console.log("oSipSessionCall");
console.log(oSipSessionCall);
console.log("oSipSessionHeldCall");
console.log(oSipSessionHeldCall);
console.log("bSwitchingCalls: " + bSwitchingCalls );
console.log("bHeldCallPendingHangup: " + bHeldCallPendingHangup);
    tsk_utils_log_info('==session event = ' + e.type);

    switch (e.type) {
        case 'connecting': case 'connected':
            {
                var bConnected = (e.type == 'connected');
                if (e.session == oSipSessionRegister) {
                    uiOnConnectionEvent(bConnected, !bConnected);
                    txtRegStatus.innerHTML = '<img src="images/reg-status-connected.png" height="24" /><i>' + e.description + '</i>';

                    // Display shortcuts
                    shortcutsObj = ( JSON.parse( window.sessionStorage.getItem( 'org.doubango.shortcuts' ) ) );
                    shortcutEnum();
                    if ( "0" == window.localStorage.getItem( 'org.doubango.uiPref.shortcutsVisible' ) ) {
                        uiShowHideShortcuts( 0 );
                    } 
                    else {
                        uiShowHideShortcuts( 1 );
                    }

                }
                else if (e.session == oSipSessionCall) {
                    btnHangUp.title = 'Hang Up';
                    btnAudio.disabled = true;
                    btnVideo.disabled = true;
                    btnScreenShare.disabled = true;
                    btnHangUp.disabled = false;
                    btnTransfer.disabled = false;
                    if (window.btnBFCP) window.btnBFCP.disabled = false;

                    if (bConnected) {
                        stopRingbackTone();
                        stopRingTone();

                        if (oNotifICall) {
                            oNotifICall.cancel();
                            oNotifICall = null;
                        }
                    }

                    txtCallStatus.innerHTML = "<i>" + e.description + "</i>";
                    // 2021.01.13 Edit by jgullo - Rather than doing this with opacity, hide it
                    if ( bConnected ) {
                        divCallWrapper.classList.add( 'border-top-separator' );
                        divCallWrapper.classList.add( 'theme-accent-color-border' );
                    } else {
                        divCallWrapper.classList.remove( 'border-top-separator' );
                        divCallWrapper.classList.remove( 'theme-accent-color-border' );
                    }
                    divCallOptions.style.display = bConnected ? 'block' : 'none';
                    divCallList.style.display = bConnected ? 'block' : 'none';

                    if (SIPml.isWebRtc4AllSupported()) { // IE don't provide stream callback
                        // Show remote video, show local camera, hide local screencast
                        uiVideoElementDraw( 1, 1 );
                    }
                    if ( bSwitchingCalls == "waitingAccept" ) {
                        bSwitchingCalls = "acceptComplete";
                        if ( oSipSessionCall.o_session.media.e_type.s_name == "audio" ) {
                            sipCallWaiting("call-audio");
                        } else if ( oSipSessionCall.o_session.media.e_type.s_name == "audio/video" ) {
                            sipCallWaiting("call-audiovideo");
                        }
                    } 
                }
                break;
            } // 'connecting' | 'connected'
        case 'terminating':
            {
                break;
            } // 'connecting' | 'connected'
        case 'terminated':
            {
                if ( e.description == "Request Cancelled" ) {
                    // Detect if a call is missed, then log a missed call
                    historyAppendLog( "Missed", oSipSessionCall.o_session.media.e_type.s_name, Date.now(), oSipSessionCall.o_session.o_uri_from.s_user_name, oSipSessionCall.o_session.o_uri_from.s_display_name );
                }
                else if ( e.description == "Call Rejected" ) {
                    // Detect a "Declined" Call, then log it
                    historyAppendLog( "Declined", oSipSessionCall.o_session.media.e_type.s_name, Date.now(), oSipSessionCall.o_session.o_uri_from.s_user_name, oSipSessionCall.o_session.o_uri_from.s_display_name );
                }
//                bHeldCallPendingHangup = false;
                // Cleanup call list
                var heldCallButton = document.getElementById('callButton' + e.session.o_session.o_uri_from.s_user_name );
                if ( heldCallButton ) {
                    divCallList.removeChild( heldCallButton );
                } else if ( e.session.o_session.o_uri_to ) {
                    if ( e.session.o_session.o_uri_to.s_user_name == txtPhoneNumber.value ) {
                        var heldCallButton = document.getElementById( 'callButton' + txtPhoneNumber.value );
                        if ( heldCallButton ) {
                            divCallList.removeChild( heldCallButton );
                        }
                    }
                } else {
                    var heldCallButton = document.getElementById( 'callButton' + txtPhoneNumber.value );
                    if ( heldCallButton ) {
                        divCallList.removeChild( heldCallButton );
                    }
                }
//                var callButtonIncoming = document.getElementById('callButton' + e.session.o_session.o_uri_from.s_user_name );
//                var callButtonOutgoing = document.getElementById('callButton' + txtPhoneNumber.value );
//                if ( callButtonIncoming ) {
//                    divCallList.removeChild( callButtonIncoming );
//                }
//                else if ( callButtonOutgoing ) {
//                    divCallList.removeChild( callButtonOutgoing );
//                }

                if ( btnAudio.classList.contains( 'btnBlink' ) ) {
                    btnAudio.classList.remove( 'btnBlink' );
                }
                if ( btnVideo.classList.contains( 'btnBlink' ) ) {
                    btnVideo.classList.remove( 'btnBlink' );
                }
                if ( btnHangUp.classList.contains( 'btnBlink' ) ) {
                    btnHangUp.classList.remove( 'btnBlink' );
                }

                if ( bHeldCallPendingHangup ) {
                    oSipSessionHeldCall = null;
                    bHeldCallPendingHangup = false;
                } else {
                    if (e.session == oSipSessionRegister) {
                        uiOnConnectionEvent(false, false);

                        oSipSessionCall = null;
                        oSipSessionRegister = null;

                        txtRegStatus.innerHTML = '<img src="images/reg-status-disconnected.png" height="24" /><i>' + e.description + '</i>';
                    }
                    else if (e.session == oSipSessionCall) {
                        uiCallTerminated(e.description);
                    }
                    btnAudio.disabled = false;
                    btnVideo.disabled = ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false );
                    btnScreenShare.disabled = ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false );
                }
                break;
            } // 'terminating' | 'terminated'

        case 'm_stream_video_local_added':
            {
                if (e.session == oSipSessionCall) {
                    // Don't change remote video, draw local camera, don't change local screencast
                    uiVideoElementDraw( 2, 1 );
                }
                break;
            }
        case 'm_stream_video_local_removed':
            {
                if (e.session == oSipSessionCall) {
                    // Don't change remote video, hide local camera, don't change local screencast
                    uiVideoElementDraw( 2, 0 );
                }
                break;
            }
        case 'm_stream_video_remote_added':
            {
                if (e.session == oSipSessionCall) {
                    // Draw remote video, hide local camera, hide local screencast
                    uiVideoElementDraw( 1, 2 );
                }
                break;
            }
        case 'm_stream_video_remote_removed':
            {
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
                break;
            }

        case 'i_ect_new_call':
            {
                oSipSessionTransferCall = e.session;
                break;
            }

        case 'i_ao_request':
            {
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
                if (e.session == oSipSessionCall) {
                    stopRingbackTone();
                    stopRingTone();
                    txtCallStatus.innerHTML = '<i>Early media started</i>';
                }
                break;
            }

        case 'm_local_hold_ok':
            {
                if (e.session == oSipSessionCall) {
                    oSipSessionCall.bHeld = true;
                    if ( bSwitchingCalls == "waitingHold" ) {
                        bSwitchingCalls = "holdComplete";
//                         setTimeout( function() {
                        if ( oSipSessionCall.o_session.media.e_type.s_name == "audio" ) {
                            sipCallWaiting("call-audio");
                        } else if ( oSipSessionCall.o_session.media.e_type.s_name == "audio/video" ) {
                            sipCallWaiting("call-audiovideo");
                        }
//                         },250);
                    } else if ( bSwitchingCalls == "waitingFixHold" ) {
                        bSwitchingCalls = "fixHoldComplete";
//                        setTimeout( function() {
                        if ( oSipSessionCall.o_session.media.e_type.s_name == "audio" ) {
                            sipCallWaiting("call-audio");
                        } else if ( oSipSessionCall.o_session.media.e_type.s_name == "audio/video" ) {
                            sipCallWaiting("call-audiovideo");
                        }
//                        },250);
                    } else {
                        if (oSipSessionCall.bTransfering) {
                            oSipSessionCall.bTransfering = false;
                            // this.AVSession.TransferCall(this.transferUri);
                        }
                        btnHoldResume.value = 'Resume';
                        btnHoldResume.disabled = false;
                        txtCallStatus.innerHTML = '<i>Call placed on hold</i>';
                    }
                }
                break;
            }
        case 'm_local_hold_nok':
            {
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
                if (e.session == oSipSessionCall) {
                    oSipSessionCall.bHeld = false;
                    if ( bSwitchingCalls == "waitingResume" ) {
                        bSwitchingCalls = "resumeComplete";
//                         setTimeout( function() {
                        if ( oSipSessionCall.o_session.media.e_type.s_name == "audio" ) {
                            sipCallWaiting("call-audio");
                        } else if ( oSipSessionCall.o_session.media.e_type.s_name == "audio/video" ) {
                            sipCallWaiting("call-audiovideo");
                        }
//                         },250);
                    } else if ( bSwitchingCalls == "waitingFixResume" ) {
                        bSwitchingCalls = "fixResumeComplete";
//                         setTimeout( function() {
                        if ( oSipSessionCall.o_session.media.e_type.s_name == "audio" ) {
                            sipCallWaiting("call-audio");
                        } else if ( oSipSessionCall.o_session.media.e_type.s_name == "audio/video" ) {
                            sipCallWaiting("call-audiovideo");
                        }
//                         },250);
                    } else {
                        oSipSessionCall.bTransfering = false;
                        btnHoldResume.value = 'Hold';
                        btnHoldResume.disabled = false;
                        txtCallStatus.innerHTML = '<i>Call taken off hold</i>';

                        if (SIPml.isWebRtc4AllSupported()) { // IE don't provide stream callback yet
                            uiVideoDisplayEvent(false, true);
                            uiVideoDisplayEvent(true, true);
                        }
                    }
                }
                break;
            }
        case 'm_local_resume_nok':
            {
                if (e.session == oSipSessionCall) {
                    oSipSessionCall.bTransfering = false;
                    btnHoldResume.disabled = false;
                    txtCallStatus.innerHTML = '<i>Failed to unhold call</i>';
                }
                break;
            }
        case 'm_remote_hold':
            {
                if (e.session == oSipSessionCall) {
                    txtCallStatus.innerHTML = '<i>Placed on hold by remote party</i>';
                }
                break;
            }
        case 'm_remote_resume':
            {
                if (e.session == oSipSessionCall) {
                    txtCallStatus.innerHTML = '<i>Taken off hold by remote party</i>';
                }
                break;
            }
        case 'm_bfcp_info':
            {
                if (e.session == oSipSessionCall) {
                    txtCallStatus.innerHTML = 'BFCP Info: <i>' + e.description + '</i>';
                }
                break;
            }

        case 'o_ect_trying':
            {
                if (e.session == oSipSessionCall) {
                    txtCallStatus.innerHTML = '<i>Call transfer in progress...</i>';
                }
                break;
            }
        case 'o_ect_accepted':
            {
                if (e.session == oSipSessionCall) {
                    txtCallStatus.innerHTML = '<i>Call transfer accepted</i>';
                }
                break;
            }
        case 'o_ect_completed':
        case 'i_ect_completed':
            {
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
                if (e.session == oSipSessionCall) {
                    txtCallStatus.innerHTML = '<i>Call transfer failed</i>';
                    btnTransfer.disabled = false;
                }
                break;
            }
        case 'o_ect_notify':
        case 'i_ect_notify':
            {
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
    window.sessionStorage.setItem('org.doubango.expert.disable_video', cbVideoDisable.checked ? true : false);
    window.sessionStorage.setItem('org.doubango.expert.enable_rtcweb_breaker', cbRTCWebBreaker.checked ? true : false);
    if (!txtWebsocketServerUrl.disabled) {
        window.sessionStorage.setItem('org.doubango.expert.websocket_server_url', txtWebsocketServerUrl.value);
    }
    window.sessionStorage.setItem('org.doubango.expert.sip_outboundproxy_url', txtSIPOutboundProxyUrl.value);
    window.sessionStorage.setItem('org.doubango.expert.ice_servers', txtIceServers.value);
    window.sessionStorage.setItem('org.doubango.expert.bandwidth', txtBandwidth.value);
    window.sessionStorage.setItem('org.doubango.expert.video_size', txtSizeVideo.value);
    window.sessionStorage.setItem('org.doubango.expert.disable_early_ims', cbEarlyIMS.checked ? true : false);
    window.sessionStorage.setItem('org.doubango.expert.disable_debug', cbDebugMessages.checked ? true : false);
    window.sessionStorage.setItem('org.doubango.expert.enable_media_caching', cbCacheMediaStream.checked ? true : false);
    window.sessionStorage.setItem('org.doubango.expert.disable_callbtn_options', cbCallButtonOptions.checked ? true : false);
    btnVideo.disabled = ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false );
    btnScreenShare.disabled = ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false );
    txtCallStatus.innerHTML = '<i>Saved</i>';
    $(".screen-overlay").removeClass("show");
    $(".offcanvas").removeClass("show");
    $("body").removeClass("offcanvas-active");
}

function settingsRevert(bNotUserAction) {
    cbVideoDisable.checked = (window.sessionStorage.getItem('org.doubango.expert.disable_video') == true);
    cbRTCWebBreaker.checked = (window.sessionStorage.getItem('org.doubango.expert.enable_rtcweb_breaker') == true);
    txtWebsocketServerUrl.value = (window.sessionStorage.getItem('org.doubango.expert.websocket_server_url') || "");
    txtSIPOutboundProxyUrl.value = (window.sessionStorage.getItem('org.doubango.expert.sip_outboundproxy_url') || "");
    txtIceServers.value = (window.sessionStorage.getItem('org.doubango.expert.ice_servers') || "");
    txtBandwidth.value = (window.sessionStorage.getItem('org.doubango.expert.bandwidth') || "");
    txtSizeVideo.value = (window.sessionStorage.getItem('org.doubango.expert.video_size') || "");
    cbEarlyIMS.checked = (window.sessionStorage.getItem('org.doubango.expert.disable_early_ims') == true);
    cbDebugMessages.checked = (window.sessionStorage.getItem('org.doubango.expert.disable_debug') == true);
    cbCacheMediaStream.checked = (window.sessionStorage.getItem('org.doubango.expert.enable_media_caching') == true);
    cbCallButtonOptions.checked = (window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') == true);
    btnVideo.disabled = ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false );
    btnScreenShare.disabled = ( "true" == window.sessionStorage.getItem('org.doubango.expert.disable_callbtn_options') || "true" == window.sessionStorage.getItem('org.doubango.expert.disable_video') ? true : false );

    if (!bNotUserAction) {
        txtCallStatus.innerHTML = '<i>Reverted</i>';
    }
    $(".screen-overlay").removeClass("show");
    $(".offcanvas").removeClass("show");
    $("body").removeClass("offcanvas-active");
}
