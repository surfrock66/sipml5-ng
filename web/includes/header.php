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
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png">
        <link rel="manifest" href="/icons/manifest.json">
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#5d4183">
        <link rel="shortcut icon" href="/icons/favicon.ico">
        <meta name="apple-mobile-web-app-title" content="SEIU1000 Contract">
        <meta name="application-name" content="SEIU1000 Contract">
        <meta name="msapplication-TileColor" content="#5d4183">
        <meta name="msapplication-TileImage" content="/icons/mstile-150x150.png">
        <meta name="msapplication-config" content="/icons/browserconfig.xml">
        <meta name="theme-color" content="#5d4183">

        <!-- Google Webfonts -->
        <link href='https://fonts.googleapis.com/css?family=Montserrat:400,700' rel='stylesheet' type='text/css'>
        <link href='https://fonts.googleapis.com/css?family=Open+Sans' rel='stylesheet' type='text/css'>
        
        <!-- jQuery Theme-->
        <link rel="stylesheet" href="https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">
        <!-- jQuery -->
        <script src="https://code.jquery.com/jquery-3.4.1.min.js" integrity="sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=" crossorigin="anonymous"></script>
        <!-- jQuery UI -->
        <script src="https://code.jquery.com/ui/1.12.1/jquery-ui.min.js" integrity="sha256-VazP97ZCwtekAsvgPBSUwPFKdrwD3unUfSGVYrahUqU=" crossorigin="anonymous"></script>
    
        <!-- Bootstrap -->
        <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
        <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM" crossorigin="anonymous"></script>
        
        <!-- CSS -->
        <link rel="stylesheet" href="css/style.css">
        <!--<link href="./assets/css/bootstrap.css" rel="stylesheet" />-->
        <!--<link href="./assets/css/bootstrap-responsive.css" rel="stylesheet" />-->

        <!-- Scripts -->
        <script src="./js/SIPml-api.js" type="text/javascript"> </script>
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
<?php //echo $_SESSION['ContractYear'] ?>
        <div class="fixed-top navbar-seiu pt-3">
            <div class="container">
                <div class="row">
                    <div class="col-6 col-sm-6 col-lg-6">
                        <div class="branding">
                            <div class="logo">
                                <img src="/images/logo.svg" alt="SEIU Local 1000" />
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-sm-6 col-lg-6">
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

