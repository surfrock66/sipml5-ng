﻿<?php
        require("config.php");
?>
<!DOCTYPE html>
<!--
* Copyright (C) 2012-2016 Doubango Telecom <http://www.doubango.org>
* License: BSD
* This file is part of Open Source sipML5 solution <http://www.sipml5.org>
-->
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>sipML5 - Expert mode</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="Keywords" content="doubango, VoIP, HTML5, WebRTC, RTCWeb, SIP, IMS, Video chat, VP8 " />
    <meta name="Description" content="HTML5 SIP client using WebRTC framework" />
    <meta name="author" content="Doubango Telecom" />
    <!-- Le styles -->
    <link href="./assets/css/bootstrap.css" rel="stylesheet" />
    <style type="text/css">
        body
        {
            padding-top: 80px;
            padding-bottom: 40px;
        }
    </style>
    <link href="./assets/css/bootstrap-responsive.css" rel="stylesheet" />
    <!-- Le HTML5 shim, for IE6-8 support of HTML5 elements -->
    <!--[if lt IE 9]>
      <script src="http://html5shim.googlecode.com/svn/trunk/html5.js"></script>
    <![endif]-->
    <!-- Le fav and touch icons -->
    <link rel="shortcut icon" href="./assets/ico/favicon.ico" />
    <link rel="apple-touch-icon-precomposed" sizes="114x114" href="./assets/ico/apple-touch-icon-114-precomposed.png" />
    <link rel="apple-touch-icon-precomposed" sizes="72x72" href="./assets/ico/apple-touch-icon-72-precomposed.png" />
    <link rel="apple-touch-icon-precomposed" href="./assets/ico/apple-touch-icon-57-precomposed.png" />
</head>

<script type="text/javascript">

    var cbVideoDisable;
    var cbAVPFDisable;
    var txtWebsocketServerUrl;
    var txtSIPOutboundProxyUrl;
    var txtInfo;

    window.onload = function () {
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
    }

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
</script>

<body>
    <div class="container">
        <div class="span7 well">
            <label align="center" id="txtInfo"> </label>
            <h2> Expert settings</h2>
            <br />
            <table style='width: 100%'>
                <tr>
                    <td>
                        <label style="height: 100%">Disable Video:</label>
                    </td>
                    <td>
                        <input type='checkbox' id='cbVideoDisable' />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label style="height: 100%">Enable RTCWeb Breaker<sup><a href="#aRTCWebBreaker">[1]</a></sup>:</label>
                    </td>
                    <td>
                        <input type='checkbox' id='cbRTCWebBreaker' />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label style="height: 100%">WebSocket Server URL<sup><a href="#aWebSocketServerURL">[2]</a></sup>:</label>
                    </td>
                    <td>
		    <input type="text" style="width: 100%; height: 100%" id="txtWebsocketServerUrl" value="<?php echo constant("WEBSOCKETURL"); ?>" placeholder="<?php echo constant("WEBSOCKETURL"); ?>" />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label style="height: 100%">SIP outbound Proxy URL<sup><a href="#aSIPOutboundProxyURL">[3]</a></sup>:</label>
                    </td>
                    <td>
                        <input type="text" style="width: 100%; height: 100%" id="txtSIPOutboundProxyUrl" value="" placeholder="e.g. udp://sipml5.org:5060" />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label style="height: 100%">ICE Servers<sup><a href="#aIceServers">[4]</a></sup>:</label>
                    </td>
                    <td>
                        <input type="text" style="width: 100%; height: 100%" id="txtIceServers" value="" placeholder="e.g. [{ url: 'stun:stun.l.google.com:19302'}, { url:'turn:user@numb.viagenie.ca', credential:'myPassword'}]" />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label style="height: 100%">Max bandwidth (kbps)<sup><a href="#aBandwidth">[5]</a></sup>:</label>
                    </td>
                    <td>
                        <input type="text" style="width: 100%; height: 100%" id="txtBandwidth" value="" placeholder="{ audio:64, video:512 }" />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label style="height: 100%">Video size<sup><a href="#aSizeVideo">[6]</a></sup>:</label>
                    </td>
                    <td>
                        <input type="text" style="width: 100%; height: 100%" id="txtSizeVideo" value="" placeholder="{ minWidth: 640, minHeight:480, maxWidth: 640, maxHeight:480 }" />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label style="height: 100%">Disable 3GPP Early IMS<sup><a href="#aEarlyIMS">[7]</a></sup>:</label>
                    </td>
                    <td>
                        <input type='checkbox' id='cbEarlyIMS' />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label style="height: 100%">Disable debug messages<sup><a href="#aDebugMessages">[8]</a></sup>:</label>
                    </td>
                    <td>
                        <input type='checkbox' id='cbDebugMessages' />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label style="height: 100%">Cache the media stream<sup><a href="#aCacheMediaStream">[9]</a></sup>:</label>
                    </td>
                    <td>
                        <input type='checkbox' id='cbCacheMediaStream' />
                    </td>
                </tr>
                <tr>
                    <td>
                        <label style="height: 100%">Disable Call button options<sup><a href="#aCallButtonOptions">[10]</a></sup>:</label>
                    </td>
                    <td>
                        <input type='checkbox' id='cbCallButtonOptions' />
                    </td>
                </tr>
                <tr>
                    <td colspan="2" align="right">
                        <input type="button" class="btn-success" id="btnSave" value="Save" onclick='settingsSave();' />
                        &nbsp;
                        <input type="button" class="btn-danger" id="btnRevert" value="Revert" onclick='settingsRevert();' />
                    </td>
               </tr>

            </table>
        </div>
    </div>

    <hr />
    <footer>
            
            <a name="aRTCWebBreaker"><sup><b>[1]</b></sup></a> The <b>RTCWeb Breaker</b> is used to enable audio and video transcoding when the endpoints do not support the same codecs or the remote server is not RTCWeb-compliant. Please note that the <b>Media Coder</b> will most likely be disabled on the <b>sipml5.org</b> hosted server.<br />
            For example, you can enable this feature if:
            <ul>
                <li>You want to make call from/to <b>Chrome</b> to/from <b>Firefox Nightly</b></li>
                <li>You're using any RTCWeb-capable browser and trying to call the PSTN network</li>
                <li>You're using any RTCWeb-capable browser and trying to call any SIP client (e.g. <b>xlite</b>) not implementing some mandatory features (e.g. <b>ICE</b>, <b>DTLS-SRTP</b>...)</li>
                <li>You're using <b>Google Chrome</b> which only support VP8 codec and trying to call a SIP-legacy client supporting only <b>H.264</b>, <b>H.263</b>, <b>Theora</b> or <b>MP4V-ES</b></li>
                <li>Making audio/video calls from/to <a href="https://www.google.com/intl/en/chrome/browser/">Google Chrome</a> to/from <a href="https://labs.ericsson.com/apps/bowser">Ericsson Bowser</a></li>
                <li>Your media server is not RTCWeb-capable (e.g. <b>FreeSWITCH</b>)</li>
            </ul>
            Please check the <a href="http://webrtc2sip.org/technical-guide-1.0.pdf">Technical guide</a> for more information about the <b>RTCWeb Breaker</b> and <b>Media Coder</b>.<br />
            
            <a name="aWebSocketServerURL"><sup><b>[2]</b></sup></a> The <b>WebSocket Server URL</b> is only required if you're a developer and using your own SIP Proxy gateway not publicly reachable. <br />
            
            <a name="aSIPOutboundProxyURL"><sup><b>[3]</b></sup></a> The <b>SIP outbound Proxy URL</b> is used to set the destination IP address and Port to use for all outgoing requests regardless the <i>domain name</i> (a.k.a <i>realm</i>).
            This is a good option for developers using a SIP domain name without valid DNS A/NAPTR/SRV records. <br />
            
            <a name="aIceServers"><sup><b>[4]</b></sup></a> This must be an array of STUN/TURN servers to use. The format is as explained at <a href="http://www.w3.org/TR/webrtc/#rtciceserver-type">http://www.w3.org/TR/webrtc/#rtciceserver-type</a> <br />
            To disable TURN/STUN to speedup ICE candidates gathering you can use an empty array. e.g. <i>[]</i>. <br />
            Example: <i>[{ url: 'stun:stun.l.google.com:19302'}, { url:'turn:user@numb.viagenie.ca', credential:'myPassword'}]</i> <br />
            
            <a name="aBandwidth"><sup><b>[5]</b></sup></a> Defines the maximum audio and video bandwidth to use. This will change the outhoing SDP to include a "b:AS=" attribute. Use <i>0</i> to let the browser negotiates the right value using RTCP-REMB and congestion control.<br />
            Example: <i>{ audio:64, video:512 }</i> <br />

            <a name="aSizeVideo"><sup><b>[6]</b></sup></a> Defines the maximum and minimum video size to be used. All values are optional. The browser will try to find the best video size between <i>max</i> and <i>min</i> based on the camera capabilities. <br />
            Example: <i><b>{</b> minWidth: 640, minHeight:480, maxWidth: 640, maxHeight:480 <b>}</b></i>. The <b>{</b> and <b>}</b> around the values are required. <br />
            
            <a name="aEarlyIMS"><sup><b>[7]</b></sup></a> Whether to enable 3GGP Early IMS as per <a href="http://www.arib.or.jp/english/html/overview/doc/STD-T63v9_60/5_Appendix/Rel6/33/33978-660.pdf" target=_blank>TR 33.978</a>. This option should not be checked unless you're using a real IMS/LTE network. <br />
            If earlyIMS is disabled then, authentication will be done as per <i>3GPP TS 24.229 - 5.1.1.2.2</i>. <br />
            
            <a name="aDebugMessages"><sup><b>[8]</b></sup></a> Whether to disable debug messages. SIPML5 supports #4 debug levels: <i>INFO</i>, <i>WARN</i>, <i>ERROR</i> and <i>FATAL</i>. Default level is <i>INFO</i>. Check this option to set the level value to <i>ERROR</i>. <br />
            
            <a name="aCacheMediaStream"><sup><b>[9]</b></sup></a> Whether to reuse the same media stream for all calls. If your website is <b>not using https</b> then, the browser will request access to the camera (or microphone) every time you try to make a call. Caching the media stream will avoid getting these notifications for each call. <br />
            
            <a name="aCallButtonOptions"><sup><b>[10]</b></sup></a> Whether to add options (<i>Audio</i>, <i>Video</i>, <i>Screen share</i>) in the the call button. <br />

    </footer>
</body>
</html>
