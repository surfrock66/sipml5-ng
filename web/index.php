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
    // If database variables are defined, initialize the database connection
    if ( defined ( 'MYSQLHOST' ) && defined ( 'MYSQLUSER' ) && defined ( 'MYSQLPASS' ) && defined ( 'MYSQLPORT' ) && defined ( 'MYSQLDBNAME' ) ) {
        if ( !empty ( MYSQLHOST ) && !empty ( MYSQLUSER ) && !empty ( MYSQLPASS ) && !empty ( MYSQLPORT ) && !empty ( MYSQLDBNAME ) ) {
            // Connect to Database
            $con = mysqli_connect( MYSQLHOST , MYSQLUSER , MYSQLPASS , MYSQLDBNAME , MYSQLPORT ) or die(mysqli_error( $con ) );
            mysqli_select_db( $con, MYSQLDBNAME ) or die( mysqli_error( $con ) );
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
               <div class="col col-xs-12 col-sm-12 col-lg-10">
               <div id="divCallCtrl">
                    <!-- Divs for status update messages -->
                    <div id="divStatusMsgs">
                        <div style="width: 20%; text-align: center; float: left;">
                            <label align="center" id="txtRegStatus"><img src="images/reg-status-disconnected.png" height=24px;" /><i>Disconnected</i></label>
                        </div>
                        <div style="width: 80%; text-align: center;">
                            <label align="center" id="txtCallStatus"></label>
                        </div>
                    </div>
                    <div class="div-dialer">
                        <h2>Call control</h2>
<?php
    // Remove the onchange function if ldap paramaters are not defined as AD contact lookup will be disabled
    if ( !defined ( 'LDAPURI' ) || !defined ( 'LDAPBINDUSER' ) || !defined ( 'LDAPBINDPASS' ) || !defined ( 'LDAPBASEDN' ) ) {
?>
                        <input type="text" style="width: 100%;" id="txtPhoneNumber" value="" placeholder="Enter phone number or type a name to search" list="ADContacts" />
<?php
    } else {
?>
                        <input type="text" style="width: 100%;" id="txtPhoneNumber" value="" placeholder="Enter phone number or type a name to search" list="ADContacts" onchange="selectContact(event)" />
<?php
    }
?>
                        <datalist id="ADContacts">
                            <option data-value="Enter phone number or type a name to search" value=""></option>
                        </datalist>
                    </div>
                    <label id="txtContactInfo"></label>
                    <div class="btn-toolbar">
                        <div id="divBtnCallGroup">
                            <input type="button" disabled class="btn btn-primary btn-sm" id="btnAudio" href="#" value="Audio" onclick="sipCall(&quot;call-audio&quot;);" />&nbsp;
                            <input type="button" disabled class="btn btn-primary btn-sm" id="btnVideo" href="#" value="Video" onclick="sipCall(&quot;call-audiovideo&quot;);" />&nbsp;
                            <input type="button" disabled class="btn btn-primary btn-sm" id="btnScreenShare" href="#" value="Screen Share" onclick="sipCall(&quot;call-screenshare&quot;);" />&nbsp;
                            <input type="button" disabled class="btn btn-primary btn-sm" id="btnChat" href="#" value="Chat" onclick="chatDisplay( txtPhoneNumber.value );" />&nbsp;
                            <input type="button" disabled class="btn btn-primary btn-sm" id="btnHangUp" value="HangUp" onclick='sipHangUp();' />&nbsp;
                            <input type="button" class="btn btn-primary btn-sm" id="btnKeyPad" value="KeyPad" onclick='openKeyPad();' />
                            &nbsp;&nbsp;
                            <input type="button" disabled class="btn btn-primary btn-sm" id="btnChatShowHide" value="Show Chat" onclick='uiShowHideChat( 1 );' />
                            <input type="button" class="btn btn-primary btn-sm" id="btnShortcutsShowHide" value="Hide Shortcuts" onclick='uiShowHideShortcuts( 0 );' />
                        </div>
                    </div>
                    <div id='divCallWrapper'>
                        <div id='divCallOptions' class='call-options'>
                            <input type="button" class="btn" style="" id="btnFullScreen" value="FullScreen" disabled onclick='toggleFullScreen();' /> &nbsp;
                            <input type="button" class="btn" style="" id="btnMute" value="Mute" onclick='sipToggleMute();' /> &nbsp;
                            <input type="button" class="btn" style="" id="btnHoldResume" value="Hold" onclick='sipToggleHoldResume();' /> &nbsp;
                            <input type="button" class="btn" style="" id="btnTransfer" value="Transfer" onclick='sipTransfer();' /> &nbsp;
                        </div>
                        <div id="divVideo" class="div-video">
                            <div id="divVideoRemoteWrapper"></div>
                            <div id="divVideoLocalWrapper"></div>
                        </div>
                    </div>
                    <div id="divShortcuts" class="border-top-separator">
                        <div id="divShortcutsHeader">
                            <a id="shortcutEditBtn" class="btn btn-primary btn-sm" href="#" data-trigger="#shortcutsOffcanvas" style="position: absolute; right: 0px;margin-right: 15px;">Edit Shortcuts</a>
                            <p style="text-align: center; width: 100%;">Shortcuts</p>
                        </div>
                        <div id="divShortcutsButtons">
                        </div>
                    </div>
                    <div id="divChat" class="container">
                        <div class="row">
                            <div id="chatList" class="col-2 border-right-separator"></div>
                            <div id="chatConversation" class="col-10"></div>
                        </div>
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
