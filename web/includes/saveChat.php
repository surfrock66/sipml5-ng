<?php
    // Load in config to set global constant variables
    require("../config.php");
    if ( isset( $_POST[ 'extension' ] ) && isset( $_POST[ 'messages' ] ) ) {
        // If database variables are defined, attempt to pre-populate the passcode and prior chat conversations
        if ( defined ( 'MYSQLHOST' ) && defined ( 'MYSQLUSER' ) && defined ( 'MYSQLPASS' ) && defined ( 'MYSQLPORT' ) && defined ( 'MYSQLDBNAME' ) ) {
            if ( !empty ( MYSQLHOST ) && !empty ( MYSQLUSER ) && !empty ( MYSQLPASS ) && !empty ( MYSQLPORT ) && !empty ( MYSQLDBNAME ) ) {
                $con = mysqli_connect( MYSQLHOST , MYSQLUSER , MYSQLPASS , MYSQLDBNAME , MYSQLPORT ) or die(mysqli_error( $con ) );
                mysqli_select_db( $con, MYSQLDBNAME ) or die( mysqli_error( $con ) );
                $queryUpdateChatsSql = "UPDATE extensions SET conversations='" . $_POST['messages'] . "' WHERE extension=" . $_POST['extension'];
 echo $queryUpdateChatsSql;
                $queryUpdateChats = mysqli_query( $con, $queryUpdateChatsSql );
                mysqli_query( $con, $queryUpdateChats ) or die( mysqli_error( $con ) );
            }
        }
    }
?>

