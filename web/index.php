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
    require('includes/header.php');
?>

        <div class="container">
            <div class="row mt-3 justify-content-md-center">
                <div id="divCallCtrl" class="col col-sm-10 col-lg-10" style='vertical-align:middle;text-align:center;'>
                    <!-- Divs for status update messages -->
                    <label style="width: 75%;" align="center" id="txtRegStatus"></label>
                    <label style="width: 75%;" align="center" id="txtCallStatus"></label>
                    <div class="div-dialer" style="width:75%;margin: auto;">
                        <h2>Call control</h2>
                        <input type="text" style="width: 100%;" id="txtPhoneNumber" value="" placeholder="Enter phone number to call" />
                    </div>
                    <div class="btn-toolbar" style="margin: 0 auto; vertical-align:middle">
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
<!--
                    <div id="divVideo" class='div-video'>
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
                        <div id="div1" style="margin-left: 300px; border:0px solid #009; z-index: 1000">
                            <iframe class="previewvideo" style="border:0px solid #009; z-index: 1000"> </iframe>
                            <div id="div2" class="previewvideo" style='border:0px solid #009; z-index: 1000'>
                                <input type="button" class="btn" style="" id="Button1" value="Button1" /> &nbsp;
                                <input type="button" class="btn" style="" id="Button2" value="Button2" /> &nbsp;
                            </div>
                        </div
                    </div>
-->
                    <div id='divCallOptions' class='call-options' style='opacity: 0; margin-top: 0px'>
                        <input type="button" class="btn" style="" id="btnFullScreen" value="FullScreen" disabled onclick='toggleFullScreen();' /> &nbsp;
                        <input type="button" class="btn" style="" id="btnMute" value="Mute" onclick='sipToggleMute();' /> &nbsp;
                        <input type="button" class="btn" style="" id="btnHoldResume" value="Hold" onclick='sipToggleHoldResume();' /> &nbsp;
                        <input type="button" class="btn" style="" id="btnTransfer" value="Transfer" onclick='sipTransfer();' /> &nbsp;
                        <input type="button" class="btn" style="" id="btnKeyPad" value="KeyPad" onclick='openKeyPad();' />
                    </div>
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
