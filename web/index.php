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
            $attrGivenName = "givenname";
            if ( defined ( 'SAMLATTRGIVENNAME' ) ) {
                if ( !empty ( SAMLATTRGIVENNAME ) ) {
                    $attrGivenName = SAMLATTRGIVENNAME;
                }
            }
            $_SESSION['givenname'] = $attributes[$attrGivenName][0];
            $attrSurname = "surname";
            if ( defined ( 'SAMLATTRSURNAME' ) ) {
                if ( !empty ( SAMLATTRSURNAME ) ) {
                    $attrSurname = SAMLATTRSURNAME;
                }
            }
            $_SESSION['surname'] = $attributes[$attrSurname][0];
            $attrExtension = "extension";
            if ( defined ( 'SAMLATTREXT' ) ) {
                if ( !empty ( SAMLATTREXT ) ) {
                    $attrExtension = SAMLATTREXT;
                }
            }
            $_SESSION['extension'] = $attributes[$attrExtension][0];
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
                        <h2 class="theme-text-color">Call control</h2>
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
                            <button disabled class="btn btn-primary btn-sm theme-accent-color " id="btnAudio" title="Audio" onclick="sipCall(&quot;call-audio&quot;);">
                                <img src="images/sipml5_ng.action.phone.png" class="icon" />
                            </button>
                            <button disabled class="btn btn-primary btn-sm theme-accent-color " id="btnVideo" title="Video" onclick="sipCall(&quot;call-audiovideo&quot;);">
                                <img src="images/sipml5_ng.action.video.png" class="icon" />
                            </button>
                            <button disabled class="btn btn-primary btn-sm theme-accent-color " id="btnScreenShare" title="Screen Share" onclick="sipCall(&quot;call-screenshare&quot;);">
                                <img src="images/sipml5_ng.action.screenshare.png" class="icon" />
                            </button>
                            <button disabled class="btn btn-primary btn-sm theme-accent-color " id="btnChat" title="Chat" onclick="chatDisplay( txtPhoneNumber.value );">
                                <img src="images/sipml5_ng.action.chat.png" class="icon" />
                            </button>
                            <button disabled class="btn btn-primary btn-sm theme-accent-color " id="btnHangUp" title="HangUp" onclick='sipHangUp();'>
                                <img src="images/sipml5_ng.action.hangup.png" class="icon" />
                            </button>
                            <input type="button" class="btn btn-primary btn-sm theme-accent-color " id="btnKeyPadShowHide" value="Show KeyPad" onclick='uiShowHideKeyPad( 1 );' />
                            <input type="button" disabled class="btn btn-primary btn-sm theme-accent-color " id="btnChatShowHide" value="Show Chat" onclick='uiShowHideChat( 1 );' />
                            <input type="button" class="btn btn-primary btn-sm theme-accent-color " id="btnShortcutsShowHide" value="Hide Shortcuts" onclick='uiShowHideShortcuts( 0 );' />
                            <input type="button" class="btn btn-primary btn-sm theme-accent-color " id="btnHistoryShowHide" value="Hide History" onclick='uiShowHideHistory( 0 );' />
<!--                            <select id="presenceStatus" onchange="sharePresence( this )">
                                <option value="open">Open</option>
                                <option value="closed">Closed</option>
                            </select>-->
                        </div>
                    </div>
                    <div id='divCallWrapper'>
                        <div id='divCallOptions' class='call-options theme-button-box-color'>
                            <input type="button" class="btn theme-accent-color " style="" id="btnFullScreen" value="FullScreen" disabled onclick='toggleFullScreen();' /> &nbsp;
                            <input type="button" class="btn theme-accent-color " style="" id="btnMute" value="Mute" onclick='sipToggleMute();' /> &nbsp;
                            <input type="button" class="btn theme-accent-color " style="" id="btnHoldResume" value="Hold" onclick='sipToggleHoldResume();' /> &nbsp;
                            <input type="button" class="btn theme-accent-color " style="" id="btnTransfer" value="Transfer" onclick='sipTransfer();' /> &nbsp;
                        </div>
                        <div id='divCallList' class='call-options theme-button-box-color'>
                            <p>Call List</p>
                        </div>
                        <div id="divVideo" class="div-video">
                            <div id="divVideoRemoteWrapper"></div>
                            <div id="divVideoLocalWrapper"></div>
                        </div>
                    </div>
                    <div id="divKeyPad" class="container border-top-separator theme-accent-color-border" style="display: none;">
                        <table style="width: 125px; height: 180px; margin: auto;">
                            <tr>
                                <td>
                                    <input type="button" style="width: 31%" class="btn btnDialpad theme-accent-color " value="1" onclick="keyPadButton('1');" />
                                    <input type="button" style="width: 31%" class="btn btnDialpad theme-accent-color " value="2" onclick="keyPadButton('2');" />
                                    <input type="button" style="width: 31%" class="btn btnDialpad theme-accent-color " value="3" onclick="keyPadButton('3');" />
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <input type="button" style="width: 31%" class="btn btnDialpad theme-accent-color " value="4" onclick="keyPadButton('4');" />
                                    <input type="button" style="width: 31%" class="btn btnDialpad theme-accent-color " value="5" onclick="keyPadButton('5');" />
                                    <input type="button" style="width: 31%" class="btn btnDialpad theme-accent-color " value="6" onclick="keyPadButton('6');" />
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <input type="button" style="width: 31%" class="btn btnDialpad theme-accent-color " value="7" onclick="keyPadButton('7');" />
                                    <input type="button" style="width: 31%" class="btn btnDialpad theme-accent-color " value="8" onclick="keyPadButton('8');" />
                                    <input type="button" style="width: 31%" class="btn btnDialpad theme-accent-color " value="9" onclick="keyPadButton('9');" />
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <input type="button" style="width: 31%" class="btn btnDialpad theme-accent-color " value="*" onclick="keyPadButton('*');" />
                                    <input type="button" style="width: 31%" class="btn btnDialpad theme-accent-color " value="0" onclick="keyPadButton('0');" />
                                    <input type="button" style="width: 31%" class="btn btnDialpad theme-accent-color " value="#" onclick="keyPadButton('#');" />
                                </td>
                            </tr>
                        </table>
                    </div>
                    <div id="divShortcuts" class="container border-top-separator theme-accent-color-border" style="display: none;">
                        <div id="divShortcutsHeader">
                            <a id="shortcutAddNewBtn" class="btn btn-primary btn-sm theme-accent-color " href="#" onclick="document.getElementById('shortcutsOffcanvas').classList.toggle('show');shortcutsEditDraw();shortcutAdd( txtContactInfo.innerText, txtPhoneNumber.value );" style="position: absolute; left: 0px;margin-left: 15px;">Create Shortcut</a>
                            <a id="shortcutEditBtn" class="btn btn-primary btn-sm theme-accent-color " href="#" data-trigger="#shortcutsOffcanvas" style="position: absolute; right: 0px;margin-right: 15px;">Edit Shortcuts</a>
                            <p style="text-align: center; width: 100%;">Shortcuts</p>
                        </div>
                        <div id="divShortcutsList">
                        </div>
                    </div>
                    <div id="divChat" class="container" style="display: none;">
                        <div class="row">
                            <div id="chatList" class="border-right-separator theme-accent-color-border"></div>
                            <div id="chatConversation"></div>
                        </div>
                    </div>
                    <div id="divHistory" class="container border-top-separator theme-accent-color-border" style="display: none;">
                        <div id="divHistoryHeader">
                            <p style="text-align: center; width: 100%;">Call History</p>
                        </div>
                        <div id="divHistoryList">
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
                $samlReturnURL = "https://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]index.php";
                if ( defined ( 'SAMLRETURNURL' ) ) {
                    if ( !empty ( SAMLRETURNURL ) ) {
                        $samlReturnURL = SAMLRETURNURL;
                    }
                }
                $_SESSION['as']->logout($samlReturnURL);
                session_destroy();
            }
        }
    }
?>
