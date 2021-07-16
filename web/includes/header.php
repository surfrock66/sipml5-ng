<!DOCTYPE html>
<!--
 * Copyright (C) 2012-2016 Doubango Telecom <http://www.doubango.org>
 * License: BSD
 * This file is part of Open Source sipML5 solution <http://www.sipml5.org>

 * The code was forked by cloudonix
 * https://github.com/cloudonix/sipml5-ng

 * The code was then forked by SEIU Local 1000 for development into a proper 
 *  SIP Webphone Solution
 * https://github.com/L1kMakes/sipml5-ng
-->

<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <!-- The above 3 meta tags *must* come first in the head; any other head content must come *after* these tags -->
        
        <!-- About -->
        <title>SEIU Local 1000 - Webphone</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="Keywords" content="doubango, sipML5, VoIP, HTML5, WebRTC, RTCWeb, SIP, IMS, Video chat, VP8" />
        <meta name="Description" content="HTML5 SIP client using WebRTC framework" />
        <meta name="author" content="Doubango Telecom" />
        <meta name="author" content="Cloudonix" />
        <meta name="author" content="SEIU Local 1000 Information Technology" />
        
        <!-- Fav and touch icons -->
        <link rel="apple-touch-icon" sizes="180x180" href="/images/icons/apple-touch-icon.png">
        <link rel="icon" type="image/png" sizes="32x32" href="/images/icons/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/images/icons/favicon-16x16.png">
        <link rel="manifest" href="/images/icons/site.webmanifest">
        <link rel="mask-icon" href="/images/icons/safari-pinned-tab.svg" color="#8165a6">
        <link rel="shortcut icon" href="/images/icons/favicon.ico">
        <meta name="msapplication-TileColor" content="#8165a6">
        <meta name="msapplication-TileImage" content="/images/icons/mstile-144x144.png">
        <meta name="msapplication-config" content="/images/icons/browserconfig.xml">
        <meta name="theme-color" content="#8165a6">

        <!-- Google Webfonts -->
        <link href='https://fonts.googleapis.com/css?family=Montserrat:400,700' rel='stylesheet' type='text/css'>
        <link href='https://fonts.googleapis.com/css?family=Open+Sans' rel='stylesheet' type='text/css'>
        
        <!-- jQuery Theme-->
        <link rel="stylesheet" href="https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">
        <!-- jQuery -->
        <script src="https://code.jquery.com/jquery-3.4.1.min.js" integrity="sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=" crossorigin="anonymous"></script>
        <!-- jQuery UI -->
        <script src="https://code.jquery.com/ui/1.12.1/jquery-ui.min.js" integrity="sha256-VazP97ZCwtekAsvgPBSUwPFKdrwD3unUfSGVYrahUqU=" crossorigin="anonymous"></script>

        <!-- Popper.js -->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.11.0/umd/popper.min.js" integrity="sha384-b/U6ypiBEHpOf/4+1nzFpr53nxSS+GLCkfwBdFNTxtclqqenISfwAzpKaMNFNmj4" crossorigin="anonymous"></script>    
        <!-- Bootstrap -->
        <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
        <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM" crossorigin="anonymous"></script>

        <!-- CSS -->
        <link rel="stylesheet" href="css/style.css">

        <!-- Scripts -->
        <script src="./js/SIPml-api.js" type="text/javascript"> </script>
        <script type="text/javascript">
<?php
    // Pass our PHP defined variables to the local javascript session
    if ( defined ( 'REALM' ) ) {
        if ( !empty ( REALM ) ) {
            echo "            window.sessionStorage.setItem('org.doubango.identity.realm', '".REALM."');\r\n";
        }
    }
    if ( defined ( 'DISABLEVIDEO' ) ) {
        if ( !empty ( DISABLEVIDEO ) ) {
            echo "            window.sessionStorage.setItem('org.doubango.expert.disable_video', '".DISABLEVIDEO."');\r\n";
        }
    }
    if ( defined ( 'ENABLERTCWEBBREAKER' ) ) {
        if ( !empty ( ENABLERTCWEBBREAKER ) ) {
            echo "            window.sessionStorage.setItem('org.doubango.expert.enable_rtcweb_breaker', '".ENABLERTCWEBBREAKER."');\r\n";
        }
    }
    if ( defined ( 'WEBSOCKETURL' ) ) {
        if ( !empty ( WEBSOCKETURL ) ) {
            echo "            window.sessionStorage.setItem('org.doubango.expert.websocket_server_url', '".WEBSOCKETURL."');\r\n";
        }
    }
    if ( defined ( 'SIPOUTBOUNDPROXYURL' ) ) {
        if ( !empty ( SIPOUTBOUNDPROXYURL ) ) {
            echo "            window.sessionStorage.setItem('org.doubango.expert.sip_outboundproxy_url', '".SIPOUTBOUNDPROXYURL."');\r\n";
        }
    }
    if ( defined ( 'ICESERVERS' ) ) {
        if ( !empty ( ICESERVERS ) ) {
            echo "            window.sessionStorage.setItem('org.doubango.expert.ice_servers', '".ICESERVERS."');\r\n";
        }
    }
    if ( defined ( 'BANDWIDTH' ) ) {
        if ( !empty ( BANDWIDTH ) ) {
            echo "            window.sessionStorage.setItem('org.doubango.expert.bandwidth', '".BANDWIDTH."');\r\n";
        }
    }
    if ( defined ( 'VIDEOSIZE' ) ) {
        if ( !empty ( VIDEOSIZE ) ) {
            echo "            window.sessionStorage.setItem('org.doubango.expert.video_size', '".VIDEOSIZE."');\r\n";
        }
    }
    if ( defined ( 'DISABLEEARLYIMS' ) ) {
        if ( !empty ( DISABLEEARLYIMS ) ) {
            echo "            window.sessionStorage.setItem('org.doubango.expert.disable_early_ims', '".DISABLEEARLYIMS."');\r\n";
        }
    }
    if ( defined ( 'DISABLEDEBUG' ) ) {
        if ( !empty ( DISABLEDEBUG ) ) {
            echo "            window.sessionStorage.setItem('org.doubango.expert.disable_debug', '".DISABLEDEBUG."');\r\n";
        }
    }
    if ( defined ( 'ENABLEMEDIACACHING' ) ) {
        if ( !empty ( ENABLEMEDIACACHING ) ) {
            echo "            window.sessionStorage.setItem('org.doubango.expert.enable_media_caching', '".ENABLEMEDIACACHING."');\r\n";
        }
    }
    if ( defined ( 'DISABLECALLBTNOPTIONS' ) ) {
        if ( !empty ( DISABLECALLBTNOPTIONS ) ) {
            echo "            window.sessionStorage.setItem('org.doubango.expert.disable_callbtn_options', '".DISABLECALLBTNOPTIONS."');\r\n";
        }
    }
    if ( defined ( 'CHATMAXCONVOLEN' ) ) {
        if ( !empty ( CHATMAXCONVOLEN ) ) {
            echo "            window.sessionStorage.setItem('org.doubango.chat.max_convo_len', '".CHATMAXCONVOLEN."');\r\n";
        }
    }
    // If database variables are defined, set a flag for the app to use later to enable/disable features
    if ( defined ( 'MYSQLHOST' ) && defined ( 'MYSQLUSER' ) && defined ( 'MYSQLPASS' ) && defined ( 'MYSQLPORT' ) && defined ( 'MYSQLDBNAME' ) ) {
        if ( !empty ( MYSQLHOST ) && !empty ( MYSQLUSER ) && !empty ( MYSQLPASS ) && !empty ( MYSQLPORT ) && !empty ( MYSQLDBNAME ) ) {
            echo "            window.sessionStorage.setItem('org.doubango.dbenabled', 'true');\r\n";
        } else {

            echo "            window.sessionStorage.setItem('org.doubango.dbenabled', 'false');\r\n";
        }
    } else {
        echo "            window.sessionStorage.setItem('org.doubango.dbenabled', 'false');\r\n";
    }
    // 2020.12.16 - Edit by jgullo - Load variables from SAML if it's enabled
    if ( defined ( 'SAMLSPNAME' ) ) {
        if ( !empty ( SAMLSPNAME ) ) {
            echo "            window.sessionStorage.setItem('org.doubango.identity.display_name', '".$fullName."');\r\n";
            echo "            window.sessionStorage.setItem('org.doubango.identity.impi', '".$privIdValue."');\r\n";
            echo "            window.sessionStorage.setItem('org.doubango.identity.impu', '".$pubIdValue."');\r\n";
            // If database variables are defined, attempt to pre-populate the passcode and prior chat conversations
            if ( defined ( 'MYSQLHOST' ) && defined ( 'MYSQLUSER' ) && defined ( 'MYSQLPASS' ) && defined ( 'MYSQLPORT' ) && defined ( 'MYSQLDBNAME' ) ) {
                if ( !empty ( MYSQLHOST ) && !empty ( MYSQLUSER ) && !empty ( MYSQLPASS ) && !empty ( MYSQLPORT ) && !empty ( MYSQLDBNAME ) ) {
                    if ( isset( $privIdValue ) && !empty( $privIdValue ) ) {
                        // Query the DB for passcode and conversations
                        $queryExtension = mysqli_query( $con, "SELECT passcode, conversations, shortcuts FROM extensions WHERE extension=$privIdValue LIMIT 1" ) or die( mysqli_error( $con ) );
                        while ( $row = mysqli_fetch_array( $queryExtension ) ) {
                            echo "            window.sessionStorage.setItem('org.doubango.identity.password', '".$row[0]."');\r\n";
                            echo "            window.sessionStorage.setItem('org.doubango.chat.session', '".addcslashes( $row[1], "'\"" )."');\r\n";
                            if ( $row[2] == "" ) {
                                if ( defined ( 'DEFAULTSHORTCUTS' ) ) {
                                    if ( !empty ( DEFAULTSHORTCUTS ) ) {
                                        echo "            window.sessionStorage.setItem('org.doubango.shortcuts', '".json_encode( DEFAULTSHORTCUTS )."');\r\n";
                                    } else {
                                        echo "            window.sessionStorage.setItem('org.doubango.shortcuts', '');\r\n";
                                    }
                                } else {
                                    echo "            window.sessionStorage.setItem('org.doubango.shortcuts', '');\r\n";
                                }
                            } else {
                                echo "            window.sessionStorage.setItem('org.doubango.shortcuts', '".addcslashes( $row[2], "'\"" )."');\r\n";
                            }
                        }
                    }
                }
            }
        }
    }

?>
        </script>
        <script type="text/javascript">
            // jQuery for hiding and showing the registration/expert panel
            $(document).ready(function() {
                $("[data-trigger]").on("click", function(e){
                    e.preventDefault();
                    e.stopPropagation();
                    var offcanvas_id =  $(this).attr('data-trigger');
                    $(offcanvas_id).toggleClass("show");
                    $('body').toggleClass("offcanvas-active");
                    $(".screen-overlay").toggleClass("show");
                    if( offcanvas_id = 'shortcutsOffcanvas' ) {
                         shortcutsEditDraw();
                    }
                }); 

                // Close menu when pressing ESC
                $(document).on('keydown', function(event) {
                    if(event.keyCode === 27) {
                        $(".offcanvas").removeClass("show");
                        $("body").removeClass("overlay-active");
                    }
                });

                $(".btn-close, .screen-overlay").click(function(e){
                    $(".screen-overlay").removeClass("show");
                    $(".offcanvas").removeClass("show");
                    $("body").removeClass("offcanvas-active");
                }); 
            });
        </script>
        <script type="text/javascript">
<?php
    // This disables the javascript lookups if LDAP isn't configured. 
    if ( !defined ( 'LDAPURI' ) || !defined ( 'LDAPBINDUSER' ) || !defined ( 'LDAPBINDPASS' ) || !defined ( 'LDAPBASEDN' ) ) {
        echo "\n            // Disable all contact lookup code as not all LDAP configurations are defined in the config!\n\n            /*\n\n";
    }
?>
            // Code to capture the contacts list from AD id it's enabled
            var contactInfo = "Enter phone number or type a name to search";
            var oReq = new XMLHttpRequest(); // New request object
            var contactsArray = [];
            oReq.onload = function() {
                var ele = document.getElementById('ADContacts');
                contactsJSON = JSON.parse( this.responseText );
                // Code to manage the contact search dropdown
                for (var i = 0; i < contactsJSON.length; i++) {
                    // POPULATE SELECT ELEMENT WITH JSON.
                    var contact = Object.entries( contactsJSON[i] );
                    contactsArray.push( { contactNumber : contact[2][1], contactDescription : contact[1][1] } );
                    //contactsArray.push( { contact[0][0]:contact[0][1], contact[1][0]:contact[1][1], contact[2][0]:contact[2][1] } );
                    ele.innerHTML = ele.innerHTML + '<option data-value="' + contact[2][1] + '" value="' + contact[1][1] + '"></option>';
                }
            };
            oReq.open("get", "includes/getContacts.php", true);
            oReq.send();

            // Function for what to do if a contact is chosen from the dropdown
            function selectContact(event) {
                // If the LDAP contacts aren't defined, 
                // This does a search in the ADContacts array to see if the input
                //  value corresponds to an actual contact and stores it to a variable.
                //  If the lookup returns nothing it becomes "undefined"
                realNumber = $("#ADContacts option[value='" + event.target.value + "']").attr('data-value');
                // Store the starting value of the search field
                contactInfo = event.target.value;
                if ( realNumber === undefined || realNumber === null ) {
                    // If contact lookup fails, don't change the search field but
                    //  clear the contact info
                    contactInfo = "";
                } else if ( event.target.value === '' ) {
                    // If the search field is blank, clear the contact info
                    contactInfo = "";
                } else {
                    // Iterate through the ADContacts array, if there's a match pull the
                    //  description into the contact info storage
                    for ( var i = 0 ; i < contactsArray.length; i++ ) {
                        if ( contactsArray[i].contactNumber === event.target.value ) {
                            contactInfo = contactsArray[i].contactDescription;
                            break;
                        }
                    }
                    // Populate the search bar with the actual number to dial
                    txtPhoneNumber.value = $("#ADContacts option[value='" + event.target.value + "']").attr('data-value');
                }
                // Populate the contact info with the results of the above code
                txtContactInfo.innerHTML = contactInfo;
            }
<?php
    // This disables the javascript lookups if LDAP isn't configured. 
    if ( !defined ( 'LDAPURI' ) || !defined ( 'LDAPBINDUSER' ) || !defined ( 'LDAPBINDPASS' ) || !defined ( 'LDAPBASEDN' ) ) {
        echo "\n            */\n\n";
    }
?>
        </script>
        <script src="./js/mainPhone.js" type="text/javascript"></script>
    </head>
    <body style="cursor:wait">
        <!-- offcanvas panel -->
        <aside class="offcanvas" id="registrationOffcanvas">
            <header class="p-3 navbar-seiu-yellow">
                <button class="btn btn-sm btn-primary btn-close"> Close </button>
                <h3 class="mb-0">Registration</h3>
            </header>
            <div class="p-3">
                <label style="height: 100%">
                    Display Name:
                </label>
                <input type="text" style="width: 100%; height: 100%" id="txtDisplayName" value="<?php echo $fullName; ?>" placeholder="<?php echo $fullName; ?>" />
                <br />
                <label style="height: 100%">
                    Private Identity<sup>*</sup>:
                </label>
                <input type="text" style="width: 100%; height: 100%" id="txtPrivateIdentity" value="<?php echo $privIdValue; ?>" placeholder="<?php echo $privIdPlaceholder; ?>" />
                <br />
                <label style="height: 100%">
                    Public Identity<sup>*</sup>:
                </label>
                <input type="text" style="width: 100%; height: 100%" id="txtPublicIdentity" value="<?php echo $pubIdValue; ?>" placeholder="<?php echo $pubIdPlaceholder; ?>" />
                <br />
                <label style="height: 100%">Password:</label>
                <input type="password" style="width: 100%; height: 100%" id="txtPassword" value="" name="sipPassword" autocomplete="off" />
                <br />
                <label style="height: 100%">Realm<sup>*</sup>:</label>
                <input type="text" style="width: 100%; height: 100%" id="txtRealm" value="<?php echo $realm; ?>" placeholder="<?php echo $realm;?>" />
                <br /><br />
                <input type="button" class="btn btn-success" id="btnRegister" value="LogIn" disabled onclick='sipRegister();' />
                &nbsp;
                <input type="button" class="btn btn-danger" id="btnUnRegister" value="LogOut" disabled onclick='sipUnRegister();' />
                <p class="small"><sup>*</sup> <i>Mandatory Field</i></p>
                <br />
                <h2> Expert settings</h2>
                <label style="height: 100%">Disable Video:</label>
                <input type='checkbox' id='cbVideoDisable' />
                <br />
                <label style="height:100%;" title="The RTCWeb Breaker is used to enable audio and video transcoding when the endpoints do not support the same codecs or the remote server is not RTCWeb-compliant. Please note that the Media Coder will most likely be disabled on the sipml5.org hosted server.&#10;For example, you can enable this feature if:&#10;&nbsp;&nbsp;You want to make call from/to Chrome to/from Firefox Nightly&#10;&nbsp;&nbsp;You're using any RTCWeb-capable browser and trying to call the PSTN network&#10;&nbsp;&nbsp;You're using any RTCWeb-capable browser and trying to call any SIP client (e.g. xlite) not implementing some mandatory features (e.g. ICE, DTLS-SRTP...)&#10;&nbsp;&nbsp;You're using Google Chrome which only support VP8 codec and trying to call a SIP-legacy client supporting only H.264, H.263, Theora or MP4V-ES&#10;&nbsp;&nbsp;Making audio/video calls from/to Google Chrome to/from Ericsson Bowser&#10;&nbsp;&nbsp;Your media server is not RTCWeb-capable (e.g. FreeSWITCH)&#10;Please check http://webrtc2sip.org/technical-guide-1.0.pdf for more information about the RTCWeb Breaker and Media Coder.">Enable RTCWeb Breaker:</label>
                <input type='checkbox' id='cbRTCWebBreaker' />
                <br />
                <label style="height: 100%" title="The WebSocket Server URL is only required if you're a developer and using your own SIP Proxy gateway not publicly reachable.">WebSocket Server URL:</label>
                <input type="text" style="width: 100%; height: 100%" id="txtWebsocketServerUrl" value="wss://seiu-asterisk-2.ad.seiu1000.org:8089/ws" placeholder="wss://seiu-asterisk-2.ad.seiu1000.org:8089/ws" />
                <br />
                <label style="height: 100%" title="The SIP outbound Proxy URL is used to set the destination IP address and Port to use for all outgoing requests regardless the domain name (a.k.a realm).&#10;This is a good option for developers using a SIP domain name without valid DNS A/NAPTR/SRV records.">SIP outbound Proxy URL:</label>
                <input type="text" style="width: 100%; height: 100%" id="txtSIPOutboundProxyUrl" value="" placeholder="e.g. udp://sipml5.org:5060" />
                <br />
                <label style="height: 100%" title="This must be an array of STUN/TURN servers to use. The format is as explained at http://www.w3.org/TR/webrtc/#rtciceserver-typei&#10;To disable TURN/STUN to speedup ICE candidates gathering you can use an empty array. e.g. [].&#10;Example: [{ url: 'stun:stun.l.google.com:19302'}, { url:'turn:user@numb.viagenie.ca', credential:'myPassword'}]">ICE Servers:</label>
                <input type="text" style="width: 100%; height: 100%" id="txtIceServers" value="" placeholder="e.g. [{ url: 'stun:stun.l.google.com:19302'}, { url:'turn:user@numb.viagenie.ca', credential:'myPassword'}]" />
                <br />
                <label style="height: 100%" title="Defines the maximum audio and video bandwidth to use. This will change the outhoing SDP to include a 'b:AS=' attribute. Use 0 to let the browser negotiates the right value using RTCP-REMB and congestion control.&#10;Example: { audio:64, video:512 }">Max bandwidth (kbps):</label>
                <input type="text" style="width: 100%; height: 100%" id="txtBandwidth" value="" placeholder="{ audio:64, video:512 }" />
                <br />
                <label style="height: 100%" title="Defines the maximum and minimum video size to be used. All values are optional. The browser will try to find the best video size between max and min based on the camera capabilities.&#10;Example: { minWidth: 640, minHeight:480, maxWidth: 640, maxHeight:480 }. The { and } around the values are required.">Video size:</label>
                <input type="text" style="width: 100%; height: 100%" id="txtSizeVideo" value="" placeholder="{ minWidth: 640, minHeight:480, maxWidth: 640, maxHeight:480 }" />
                <br />
                <label style="height: 100%" title="Whether to enable 3GGP Early IMS as per http://www.arib.or.jp/english/html/overview/doc/STD-T63v9_60/5_Appendix/Rel6/33/33978-660.pdf (TR 33.978). This option should not be checked unless you're using a real IMS/LTE network.&#10;If earlyIMS is disabled then, authentication will be done as per 3GPP TS 24.229 - 5.1.1.2.2">Disable 3GPP Early IMS:</label>
                <input type='checkbox' id='cbEarlyIMS' />
                <br />
                <label style="height: 100%" title="Whether to disable debug messages. SIPML5 supports #4 debug levels: INFO, WARN, ERROR and FATAL. Default level is INFO. Check this option to set the level value to ERROR.">Disable debug messages:</label>
                <input type='checkbox' id='cbDebugMessages' />
                <br />
                <label style="height: 100%" title="Whether to reuse the same media stream for all calls. If your website is not using https then, the browser will request access to the camera (or microphone) every time you try to make a call. Caching the media stream will avoid getting these notifications for each call.">Cache the media stream:</label>
                <input type='checkbox' id='cbCacheMediaStream' />
                <br />
                <label style="height: 100%" title="Whether to add options (Audio, Video, Screen share) in the the call button.">Disable Call button options:</label>
                <input type='checkbox' id='cbCallButtonOptions' />
                <br />
                <input type="button" class="btn-success" id="btnSave" value="Save" onclick='settingsSave();' />
                &nbsp;
                <input type="button" class="btn-danger" id="btnRevert" value="Revert" onclick='settingsRevert();' />
            </div>
        </aside>
        <aside class="offcanvas offcanvas-right" id="shortcutsOffcanvas">
            <header class="p-3 navbar-seiu-yellow">
                <button class="btn btn-sm btn-primary btn-close"> Close </button>
                <h3 class="mb-0">Shortcut Editor</h3>
            </header>
            <div id="divShortcutsEditor" class="p-3 container">
            </div>
        </aside>
        <!-- offcanvas panel .end -->
        <div class="fixed-top navbar-seiu">
            <div class="container h-100">
                <div class="row align-items-center h-100">
                    <div class="col-8 col-sm-8 col-lg-6">
                        <div class="container">
                            <div class="row">
                                <div class="col-2">
                                    <div class="menuBtn">
                                        <img height=36px data-trigger="#registrationOffcanvas" src="./images/menu.png" alt="Menu Icon" />
                                    </div>
                                </div>
                                <div class="col-10 branding mt-1">
                                    <div class="logo">
                                        <img src="/images/logo.svg" alt="SEIU Local 1000" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-4 col-sm-4 col-lg-6">
                        <div class="float-right">
                            <form class="navbar-form" action="index.php" method="get">
                                <input type="hidden" name="logout" value="true" />
                                <input type="submit" class="btn-sm btn-primary LogOut" value="Log Out" />
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>

