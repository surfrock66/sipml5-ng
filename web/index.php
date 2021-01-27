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
            $_SESSION['as'] = new SimpleSAML_Auth_Simple( SAMLSPNAME );
            $_SESSION['as']->requireAuth();
            $attributes = $_SESSION['as']->getAttributes();
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
    require('includes/header.php');
?>

        <div class="container">
            <div class="row mt-3 justify-content-md-center">
                <div id="divCallCtrl" class="col col-sm-10 col-lg-10" style='vertical-align:middle;text-align:center;'>
                    <!-- Divs for status update messages -->
                    <div id="divStatusMsgs" style="width:75%; margin: auto; display: block;">
                        <div style="width: 20%; float: left;">
                            <label align="center" id="txtRegStatus"><img src="images/reg-status-disconnected.png" height=24px;" /><i>Disconnected</i></label>
                        </div>
                        <div style="width: 80%;">
                            <label align="center" id="txtCallStatus"></label>
                        </div>
                    </div>
                    <div class="div-dialer" style="width:75%;margin: auto; clear: both;">
                        <h2>Call control</h2>
                        <input type="text" style="width: 100%;" id="txtPhoneNumber" value="" placeholder="Enter phone number or type a name to search" list="ADContacts" onchange="selectContact(event)" />
                        <datalist id="ADContacts">
                            <option data-value="Enter phone number or type a name to search" value=""></option>
                        </datalist>
                    </div>
                    <label style="width: 75%;" align="center" id="txtContactInfo"></label>
                    <div class="btn-toolbar" style="margin: 0 auto; vertical-align:middle; text-align:center;">
                        <div id="divBtnCallGroup" style="margin: 0 auto;">
                            <input type="button" disabled class="btn btn-primary btn-sm" id="btnAudio" href="#" value="Audio" onclick="sipCall(&quot;call-audio&quot;);" />&nbsp;
                            <input type="button" disabled class="btn btn-primary btn-sm" id="btnVideo" href="#" value="Video" onclick="sipCall(&quot;call-audiovideo&quot;);" />&nbsp;
                            <input type="button" disabled class="btn btn-primary btn-sm" id="btnScreenShare" href="#" value="Screen Share" onclick="sipShareScreen();" />&nbsp;
                            <input type="button" disabled class="btn btn-primary btn-sm" id="btnChat" href="#" value="Chat" onclick="chatDisplay( txtPhoneNumber.value );" />&nbsp;
                            <input type="button" disabled class="btn btn-primary btn-sm" id="btnHangUp" value="HangUp" onclick='sipHangUp();' />&nbsp;
                            <input type="button" class="btn btn-primary btn-sm" id="btnKeyPad" value="KeyPad" onclick='openKeyPad();' />
                        </div>
                    </div>
                    <div id='divCallOptions' class='call-options' style='display:none; margin: 5px; width:75%;'>
                        <input type="button" class="btn" style="" id="btnFullScreen" value="FullScreen" disabled onclick='toggleFullScreen();' /> &nbsp;
                        <input type="button" class="btn" style="" id="btnMute" value="Mute" onclick='sipToggleMute();' /> &nbsp;
                        <input type="button" class="btn" style="" id="btnHoldResume" value="Hold" onclick='sipToggleHoldResume();' /> &nbsp;
                        <input type="button" class="btn" style="" id="btnTransfer" value="Transfer" onclick='sipTransfer();' /> &nbsp;
                    </div>
<!--
                    <div id="divVideo" class="div-video" style="widt:75%; margin-top:5px;">
                        <div id="divVideoRemote" style='position:relative; border:1px solid #009; height:100%; width:100%; z-index: auto; opacity: 1'>
                            <video class="video" width="100%" height="100%" id="video_remote" autoplay="autoplay" style="opacity: 0; background-color: #000000; -webkit-transition-property: opacity; -webkit-transition-duration: 2s;"></video>
                        </div>
                        <div id="divVideoLocalWrapper" style="margin-left: 0px; border:0px solid #009; z-index: 1000">
                            <iframe class="previewvideo" style="border:0px solid #009; z-index: 1000"> </iframe>
                            <div id="divVideoLocal" class="previewvideo" style=' border:0px solid #009; z-index: 1000'>
                                <video class="video" width="100%" height="100%" id="video_local" autoplay="autoplay" muted="true" style="opacity: 0; background-color: #000000; -webkit-transition-property: opacity; -webkit-transition-duration: 2s;"></video>
                            </div>
                        </div>
                        <div id="divScreencastLocalWrapper" style="margin-left: 90px; border:0px solid #009; z-index: 1000">
                            <iframe class="previewvideo" style="border:0px solid #009; z-index: 1000"> </iframe>
                            <div id="divScreencastLocal" class="previewvideo" style=' border:0px solid #009; z-index: 1000'>
                            </div>
                        </div>
-->
<!--
                        <div id="div1" style="margin-left: 300px; border:0px solid #009; z-index: 1000">
                            <iframe class="previewvideo" style="border:0px solid #009; z-index: 1000"> </iframe>
                            <div id="div2" class="previewvideo" style='border:0px solid #009; z-index: 1000'>
                                <input type="button" class="btn" style="" id="Button1" value="Button1" /> &nbsp;
                                <input type="button" class="btn" style="" id="Button2" value="Button2" /> &nbsp;
                            </div>
                        </div>
                    </div>
-->
                    <div id="divChat" class="row" style="width:75%; margin: auto; margin-top:5px; padding-top: 5px; clear: both;">
                        <div class="col-2" id="chatList">
                        </div>
                        <div class="col-10" id="chatConversation">
                        </div>
                    </div>

                    <!-- Sample code for populating contact search -->
<!--                    <div>
                        <input class="contactSearcher" id="contactSearchInput" list="ADContacts" onchange="selectContact(event)"/>
                        <datalist id="ADContacts">
                            <option data-value="Enter phone number or type a name to search" value=""></option>
                        </datalist>
                    </div>
-->
                </div>
            </div>
        </div>
<?php
    require('includes/footer.php');
?>

<?php
    if ( defined ( 'SAMLSPNAME' ) ) {
        if ( !empty ( SAMLSPNAME ) ) {
            if(isset($_GET['logout'])){
                $_SESSION['as']->logout('https://seiu1000.org');
                session_destroy();
            }
        }
    }
?>
