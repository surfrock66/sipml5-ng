<?php
    // Load in config to set global constant variables
    require("config.php");
    // If a PHP session isn't started, start one
    if(session_id() == '' || !isset($_SESSION)) {
        session_start();
    }
    // This sets the default placeholders in case no credentials are passed
    $fullName = "e.g. John Doe";
    $realm = "";
    if ( defined ( 'REALM' ) ) {
        if ( !empty ( REALM ) ) {
            $realm = REALM;
        } 
    }
    // Condition to populate variables if SAML is being used
    $privIdValue = "";
    $privIdPlaceholder = "e.g. +33600000000";
    $pubIdValue = "";
    $pubIdPlaceholder = "e.g. sip:+33600000000@doubango.org";
    if ( defined ( 'SAMLSPNAME' ) ) {
        if ( !empty ( SAMLSPNAME ) ) {

            //if ( is_dir( 'simplesaml' ) ) {
            require_once('simplesaml/lib/_autoload.php');
            $as = new SimpleSAML_Auth_Simple( SAMLSPNAME );
            $as->requireAuth();
            $attributes = $as->getAttributes();
            $_SESSION['givenname'] = $attributes['givenname'][0];
            $_SESSION['surname'] = $attributes['surname'][0];
            $_SESSION['extension'] = $attributes['extension'][0];
            // 2020.12.16 - Edit by jgullo - Populate variables from saml to input later
            if ( !empty ( $_SESSION['givenname'] ) || !empty ( $_SESSION['surname'] ) ) {
                $fullName = $_SESSION['givenname']." ".$_SESSION['surname'];
            }
            if ( !empty ( $_SESSION['extension'] ) && !empty( REALM ) ) { 
                $privIdValue = $_SESSION['extension'];
                $privIdPlaceholder = $_SESSION['extension'];
                $pubIdValue = "sip:".$_SESSION['extension']."@".REALM; 
                $pubIdPlaceholder = "sip:".$_SESSION['extension']."@".REALM; 
            } 
        }
    }
?>
<!DOCTYPE html>
<!--
* Copyright (C) 2012-2016 Doubango Telecom <http://www.doubango.org>
* License: BSD
* This file is part of Open Source sipML5 solution <http://www.sipml5.org>
-->
<html>
<!-- head -->
<head>
    <meta charset="utf-8" />
    <title>sipML5 live demo</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="Keywords" content="doubango, sipML5, VoIP, HTML5, WebRTC, RTCWeb, SIP, IMS, Video chat, VP8, live demo " />
    <meta name="Description" content="HTML5 SIP client using WebRTC framework" />
    <meta name="author" content="Doubango Telecom" />

    <!-- SIPML5 API:
    DEBUG VERSION: 'SIPml-api.js'
    RELEASE VERSION: 'release/SIPml-api.js'
    -->
    <script src="SIPml-api.js?svn=250" type="text/javascript"> </script>

    <!-- Styles -->
    <link href="./assets/css/bootstrap.css" rel="stylesheet" />
    <style type="text/css">
        body {
            padding-top: 80px;
            padding-bottom: 40px;
        }

        .navbar-inner-red {
            background-color: #600000;
            background-image: none;
            background-repeat: no-repeat;
            filter: none;
        }

        .full-screen {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }

        .normal-screen {
            position: relative;
        }

        .call-options {
            padding: 5px;
            background-color: #f0f0f0;
            border: 1px solid #eee;
            border: 1px solid rgba(0, 0, 0, 0.08);
            -webkit-border-radius: 4px;
            -moz-border-radius: 4px;
            border-radius: 4px;
            -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.05);
            -moz-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.05);
            box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.05);
            -webkit-transition-property: opacity;
            -moz-transition-property: opacity;
            -o-transition-property: opacity;
            -webkit-transition-duration: 2s;
            -moz-transition-duration: 2s;
            -o-transition-duration: 2s;
        }

        .tab-video,
        .div-video {
            width: 100%;
            height: 0px;
            -webkit-transition-property: height;
            -moz-transition-property: height;
            -o-transition-property: height;
            -webkit-transition-duration: 2s;
            -moz-transition-duration: 2s;
            -o-transition-duration: 2s;
        }

        .label-align {
            display: block;
            padding-left: 15px;
            text-indent: -15px;
        }

        .input-align {
            width: 13px;
            height: 13px;
            padding: 0;
            margin: 0;
            vertical-align: bottom;
            position: relative;
            top: -1px;
            *overflow: hidden;
        }

        .glass-panel {
            z-index: 99;
            position: fixed;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            top: 0;
            left: 0;
            opacity: 0.8;
            background-color: Gray;
        }

        .div-keypad {
            z-index: 100;
            position: fixed;
            -moz-transition-property: left top;
            -o-transition-property: left top;
            -webkit-transition-duration: 2s;
            -moz-transition-duration: 2s;
            -o-transition-duration: 2s;
        }

        .previewvideo {
            position: absolute;
            width: 88px;
            height: 72px;
            margin-top: -42px;
        }
    </style>
    <link href="./assets/css/bootstrap-responsive.css" rel="stylesheet" />
    <!-- Le fav and touch icons -->
    <link rel="shortcut icon" href="./assets/ico/favicon.ico" />
    <link rel="apple-touch-icon-precomposed" sizes="114x114" href="./assets/ico/apple-touch-icon-114-precomposed.png" />
    <link rel="apple-touch-icon-precomposed" sizes="72x72" href="./assets/ico/apple-touch-icon-72-precomposed.png" />
    <link rel="apple-touch-icon-precomposed" href="./assets/ico/apple-touch-icon-57-precomposed.png" />

    <script type="text/javascript">
<?php
    // Pass our PHP defined variables to the local javascript session
    if ( defined ( 'REALM' ) ) {
        if ( !empty ( REALM ) ) {
            echo "        window.localStorage.setItem('org.doubango.identity.realm', '".REALM."');\r\n";
        }
    }
    if ( defined ( 'WEBSOCKETURL' ) ) {
        if ( !empty ( WEBSOCKETURL ) ) {
            echo "        window.localStorage.setItem('org.doubango.expert.websocket_server_url', '".WEBSOCKETURL."');\r\n";
        }
    }
    // 2020.12.16 - Edit by jgullo - Load variables from SAML if it's enabled
    if ( defined ( 'SAMLSPNAME' ) ) {
        if ( !empty ( SAMLSPNAME ) ) {
            echo "        window.localStorage.setItem('org.doubango.identity.display_name', '".$fullName."')\r\n";
            echo "        window.localStorage.setItem('org.doubango.identity.impi', '".$privIdValue."')\r\n";
            echo "        window.localStorage.setItem('org.doubango.identity.impu', '".$pubIdValue."')\r\n";
        }
    }
?>
    </script>
    <script src="./js/mainPhone.js" type="text/javascript"></script>
</head>
<body style="cursor:wait">
    <div class="navbar navbar-fixed-top">
        <div id="divNavbarInner" class="navbar-inner">
            <div class="container">
                <a class="btn btn-navbar" data-toggle="collapse" data-target=".nav-collapse">
                    <span class="icon-bar"></span><span class="icon-bar"></span><span class="icon-bar"></span>
                </a>
                <img alt="sipML5" class="brand" src="./images/sipml-34x39.png" />
                <div class="nav-collapse">
                    <ul class="nav">
                        <li class="active"><a href="index.php">Home</a></li>
                    </ul>
                </div>
                <!--/.nav-collapse -->
            </div>
        </div>
    </div>
    <div class="container">
        <div class="row-fluid">
            <div class="span4 well">
                <label style="width: 100%;" align="center" id="txtRegStatus">
                </label>
                <h2>
                    Registration
                </h2>
                <br />
                <table style='width: 100%'>
                    <tr>
                        <td>
                            <label style="height: 100%">
                                Display Name:
                            </label>
                        </td>
                        <td>
                            <input type="text" style="width: 100%; height: 100%" id="txtDisplayName" value="<?php echo $fullName; ?>" placeholder="<?php echo $fullName; ?>" />
                        </td>
                    </tr>

                    <tr>
                        <td>
                            <label style="height: 100%">
                                Private Identity<sup>*</sup>:
                            </label>
                        </td>
                        <td>
                            <input type="text" style="width: 100%; height: 100%" id="txtPrivateIdentity" value="<?php echo $privIdValue; ?>" placeholder="<?php echo $privIdPlaceholder; ?>" />
                        </td>
                    </tr>


                    <tr>
                        <td>
                            <label style="height: 100%">
                                Public Identity<sup>*</sup>:
                            </label>
                        </td>
                        <td>
                            <input type="text" style="width: 100%; height: 100%" id="txtPublicIdentity" value="<?php echo $pubIdValue; ?>" placeholder="<?php echo $pubIdPlaceholder; ?>" />
                        </td>
                    </tr>

                    <tr>
                        <td>
                            <label style="height: 100%">Password:</label>
                        </td>
                        <td>
                            <input type="password" style="width: 100%; height: 100%" id="txtPassword" value="" />
                        </td>
                    </tr>

                    <tr>
                        <td>
                            <label style="height: 100%">Realm<sup>*</sup>:</label>
                        </td>
                        <td>
			<input type="text" style="width: 100%; height: 100%" id="txtRealm" value="<?php echo $realm; ?>" placeholder="<?php echo $realm;?>" />
                        </td>
                    </tr>

                    <tr>
                        <td colspan="2" align="right">
                            <input type="button" class="btn btn-success" id="btnRegister" value="LogIn" disabled onclick='sipRegister();' />
                            &nbsp;
                            <input type="button" class="btn btn-danger" id="btnUnRegister" value="LogOut" disabled onclick='sipUnRegister();' />
                        </td>
                    </tr>
                    <tr>
                        <td colspan="3">
                            <p class="small"><sup>*</sup> <i>Mandatory Field</i></p>
                        </td>
                    </tr>
<!--
                    <tr>
                        <td colspan="3">
                            <a class="btn" href="http://code.google.com/p/sipml5/wiki/Public_SIP_Servers" target="_blank">Need SIP account?</a>
                        </td>
                    </tr>
-->
<!--
                    <tr>
                        <td colspan="3">
                            <a class="btn" href="./expert.php" target="_blank">Expert mode?</a>
                        </td>
                    </tr>
-->
                </table>
            </div>
            <div id="divCallCtrl" class="span7 well" style='display:table-cell; vertical-align:middle'>
                <label style="width: 100%;" align="center" id="txtCallStatus">
                </label>
                <h2>
                    Call control
                </h2>
                <br />
                <table style='width: 100%;'>
                    <tr>
                        <td style="white-space:nowrap;">
                            <input type="text" style="width: 100%; height:100%;" id="txtPhoneNumber" value="" placeholder="Enter phone number to call" />
                        </td>
                    </tr>
                    <tr>
                        <td colspan="1" align="right">
                            <div class="btn-toolbar" style="margin: 0; vertical-align:middle">
                                <!--div class="btn-group">
                                    <input type="button" id="btnBFCP" style="margin: 0; vertical-align:middle; height: 100%;" class="btn btn-primary" value="BFCP" onclick='sipShareScreen();' disabled />
                                </div-->
                                <div id="divBtnCallGroup" class="btn-group">
                                    <button id="btnCall" disabled class="btn btn-primary" data-toggle="dropdown">Call</button>
                                </div>&nbsp;&nbsp;
                                <div class="btn-group">
                                    <input type="button" id="btnHangUp" style="margin: 0; vertical-align:middle; height: 100%;" class="btn btn-primary" value="HangUp" onclick='sipHangUp();' disabled />
                                </div>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td id="tdVideo" class='tab-video'>
                            <div id="divVideo" class='div-video'>
                                <div id="divVideoRemote" style='position:relative; border:1px solid #009; height:100%; width:100%; z-index: auto; opacity: 1'>
                                    <video class="video" width="100%" height="100%" id="video_remote" autoplay="autoplay" style="opacity: 0;
                                        background-color: #000000; -webkit-transition-property: opacity; -webkit-transition-duration: 2s;"></video>
                                </div>

                                <div id="divVideoLocalWrapper" style="margin-left: 0px; border:0px solid #009; z-index: 1000">
                                    <iframe class="previewvideo" style="border:0px solid #009; z-index: 1000"> </iframe>
                                    <div id="divVideoLocal" class="previewvideo" style=' border:0px solid #009; z-index: 1000'>
                                        <video class="video" width="100%" height="100%" id="video_local" autoplay="autoplay" muted="true" style="opacity: 0;
                                            background-color: #000000; -webkit-transition-property: opacity;
                                            -webkit-transition-duration: 2s;"></video>
                                    </div>
                                </div>
                                <div id="divScreencastLocalWrapper" style="margin-left: 90px; border:0px solid #009; z-index: 1000">
                                    <iframe class="previewvideo" style="border:0px solid #009; z-index: 1000"> </iframe>
                                    <div id="divScreencastLocal" class="previewvideo" style=' border:0px solid #009; z-index: 1000'>
                                    </div>
                                </div>
                                <!--div id="div1" style="margin-left: 300px; border:0px solid #009; z-index: 1000">
                                    <iframe class="previewvideo" style="border:0px solid #009; z-index: 1000"> </iframe>
                                    <div id="div2" class="previewvideo" style='border:0px solid #009; z-index: 1000'>
                                      <input type="button" class="btn" style="" id="Button1" value="Button1" /> &nbsp;
                                      <input type="button" class="btn" style="" id="Button2" value="Button2" /> &nbsp;
                                    </div>
                                </div-->
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td align='center'>
                            <div id='divCallOptions' class='call-options' style='opacity: 0; margin-top: 0px'>
                                <input type="button" class="btn" style="" id="btnFullScreen" value="FullScreen" disabled onclick='toggleFullScreen();' /> &nbsp;
                                <input type="button" class="btn" style="" id="btnMute" value="Mute" onclick='sipToggleMute();' /> &nbsp;
                                <input type="button" class="btn" style="" id="btnHoldResume" value="Hold" onclick='sipToggleHoldResume();' /> &nbsp;
                                <input type="button" class="btn" style="" id="btnTransfer" value="Transfer" onclick='sipTransfer();' /> &nbsp;
                                <input type="button" class="btn" style="" id="btnKeyPad" value="KeyPad" onclick='openKeyPad();' />
                            </div>
                        </td>
                    </tr>
                </table>
            </div>
        </div>

        <br />
        <footer>

            <p>
                &copy; Doubango Telecom 2012-2016 <br />
                <i>Inspiring the future</i>
            </p>
            <!-- Creates all ATL/COM objects right now
                Will open confirmation dialogs if not already done
            -->
            <!--object id="fakeVideoDisplay" classid="clsid:5C2C407B-09D9-449B-BB83-C39B7802A684" style="visibility:hidden;"> </object-->
            <!--object id="fakeLooper" classid="clsid:7082C446-54A8-4280-A18D-54143846211A" style="visibility:visible; width:0px; height:0px"> </object-->
            <!--object id="fakeSessionDescription" classid="clsid:DBA9F8E2-F9FB-47CF-8797-986A69A1CA9C" style="visibility:hidden;"> </object-->
            <!--object id="fakeNetTransport" classid="clsid:5A7D84EC-382C-4844-AB3A-9825DBE30DAE" style="visibility:hidden;"> </object-->
            <!--object id="fakePeerConnection" classid="clsid:56D10AD3-8F52-4AA4-854B-41F4D6F9CEA3" style="visibility:hidden;"> </object-->
            <object id="fakePluginInstance" classid="clsid:69E4A9D1-824C-40DA-9680-C7424A27B6A0" style="visibility:hidden;"> </object>

            <!--
                NPAPI  browsers: Safari, Opera and Firefox
            -->
            <!--embed id="WebRtc4npapi" type="application/w4a" width='1' height='1' style='visibility:hidden;' /-->
        </footer>
    </div>
    <!-- /container -->
    <!-- Glass Panel -->
    <div id='divGlassPanel' class='glass-panel' style='visibility:hidden'></div>
    <!-- KeyPad Div -->
    <div id='divKeyPad' class='span2 well div-keypad' style="left:0px; top:0px; width:250; height:240; visibility:hidden">
        <table style="width: 100%; height: 100%">
            <tr><td><input type="button" style="width: 33%" class="btn" value="1" onclick="sipSendDTMF('1');" /><input type="button" style="width: 33%" class="btn" value="2" onclick="sipSendDTMF('2');" /><input type="button" style="width: 33%" class="btn" value="3" onclick="sipSendDTMF('3');" /></td></tr>
            <tr><td><input type="button" style="width: 33%" class="btn" value="4" onclick="sipSendDTMF('4');" /><input type="button" style="width: 33%" class="btn" value="5" onclick="sipSendDTMF('5');" /><input type="button" style="width: 33%" class="btn" value="6" onclick="sipSendDTMF('6');" /></td></tr>
            <tr><td><input type="button" style="width: 33%" class="btn" value="7" onclick="sipSendDTMF('7');" /><input type="button" style="width: 33%" class="btn" value="8" onclick="sipSendDTMF('8');" /><input type="button" style="width: 33%" class="btn" value="9" onclick="sipSendDTMF('9');" /></td></tr>
            <tr><td><input type="button" style="width: 33%" class="btn" value="*" onclick="sipSendDTMF('*');" /><input type="button" style="width: 33%" class="btn" value="0" onclick="sipSendDTMF('0');" /><input type="button" style="width: 33%" class="btn" value="#" onclick="sipSendDTMF('#');" /></td></tr>
            <tr><td colspan=3><input type="button" style="width: 100%" class="btn btn-medium btn-danger" value="close" onclick="closeKeyPad();" /></td></tr>
        </table>
    </div>
    <!-- Call button options -->
    <ul id="ulCallOptions" class="dropdown-menu" style="visibility:hidden">
        <li><a href="#" onclick='sipCall("call-audio");'>Audio</a></li>
        <li><a href="#" onclick='sipCall("call-audiovideo");'>Video</a></li>
        <li id='liScreenShare'><a href="#" onclick='sipShareScreen();'>Screen Share</a></li>
        <li class="divider"></li>
        <li><a href="#" onclick='uiDisableCallOptions();'><b>Disable these options</b></a></li>
    </ul>

    <!-- Le javascript
    ================================================== -->
    <!-- Placed at the end of the document so the pages load faster -->
    <script type="text/javascript" src="./assets/js/jquery.js"></script>
    <script type="text/javascript" src="./assets/js/bootstrap-transition.js"></script>
    <script type="text/javascript" src="./assets/js/bootstrap-alert.js"></script>
    <script type="text/javascript" src="./assets/js/bootstrap-modal.js"></script>
    <script type="text/javascript" src="./assets/js/bootstrap-dropdown.js"></script>
    <script type="text/javascript" src="./assets/js/bootstrap-scrollspy.js"></script>
    <script type="text/javascript" src="./assets/js/bootstrap-tab.js"></script>
    <script type="text/javascript" src="./assets/js/bootstrap-tooltip.js"></script>
    <script type="text/javascript" src="./assets/js/bootstrap-popover.js"></script>
    <script type="text/javascript" src="./assets/js/bootstrap-button.js"></script>
    <script type="text/javascript" src="./assets/js/bootstrap-collapse.js"></script>
    <script type="text/javascript" src="./assets/js/bootstrap-carousel.js"></script>
    <script type="text/javascript" src="./assets/js/bootstrap-typeahead.js"></script>

    <!-- Audios -->
    <audio id="audio_remote" autoplay="autoplay"> </audio>
    <audio id="ringtone" loop src="sounds/ringtone.wav"> </audio>
    <audio id="ringbacktone" loop src="sounds/ringbacktone.wav"> </audio>
    <audio id="dtmfTone" src="sounds/dtmf.wav"> </audio>

</body>
</html>
