<?php
    // Load in config to set global constant variables
    require("../config.php");
    // If database variables are defined, attempt to pre-populate the passcode and prior chat conversations
    if ( defined ( 'MYSQLHOST' ) && defined ( 'MYSQLUSER' ) && defined ( 'MYSQLPASS' ) && defined ( 'MYSQLPORT' ) && defined ( 'MYSQLDBNAME' ) ) {
        if ( !empty ( MYSQLHOST ) && !empty ( MYSQLUSER ) && !empty ( MYSQLPASS ) && !empty ( MYSQLPORT ) && !empty ( MYSQLDBNAME ) ) {
            $con = mysqli_connect( MYSQLHOST , MYSQLUSER , MYSQLPASS , MYSQLDBNAME , MYSQLPORT ) or die(mysqli_error( $con ) );
            mysqli_select_db( $con, MYSQLDBNAME ) or die( mysqli_error( $con ) );
            if ( isset( $_POST[ 'extension' ] ) ) {
                if ( isset( $_POST[ 'action' ] ) ) {
                    if ( $_POST[ 'action' ] == "saveChat" && isset( $_POST[ 'messages' ] ) ) {
                        $queryUpdateChatsSql = "UPDATE extensions SET conversations='" . mysqli_real_escape_string( $con, $_POST['messages'] ) . "' WHERE extension=" . $_POST['extension'];
                        //$queryUpdateChatsSql = "UPDATE extensions SET conversations='" . addcslashes( $_POST['messages'], "'\"" ) . "' WHERE extension=" . $_POST['extension'];
                        $queryUpdateChats = mysqli_query( $con, $queryUpdateChatsSql );
                        mysqli_query( $con, $queryUpdateChats ) or die( mysqli_error( $con ) );
                    }
                    if ( $_POST[ 'action' ] == "saveShortcuts" && isset( $_POST[ 'shortcuts' ] ) ) {
                        $queryUpdateShortcutsSql = "UPDATE extensions SET shortcuts='" . mysqli_real_escape_string( $con, $_POST['shortcuts'] ) . "' WHERE extension=" . $_POST['extension'];
                        //$queryUpdateShortcutsSql = "UPDATE extensions SET shortcuts='" . addcslashes( $_POST['shortcuts'], "'\"" ) . "' WHERE extension=" . $_POST['extension'];
                        $queryUpdateShortcuts = mysqli_query( $con, $queryUpdateShortcutsSql );
                        mysqli_query( $con, $queryUpdateShortcuts ) or die( mysqli_error( $con ) );
                    }
                } else {
                    echo "Error: No action is defined, cannot decide what to write.";
                }
            } else {
                echo "Error: No extension is defined, cannot determine where to write.";
            }
        } else {
            echo "Error: A MYSQL required variable is empty, aborting.";
        }
    } else { 
        echo "Error: A MYSQL required variable is not defined, aborting.";
    }

?>

