<?php
    // Load in config to set global constant variables
    require("../config.php");
    if ( isset( $_POST[ 'extension' ] ) && isset( $_POST[ 'shortcuts' ] ) ) {
        // If database variables are defined, attempt to pre-populate the passcode and prior chat conversations
        if ( defined ( 'MYSQLHOST' ) && defined ( 'MYSQLUSER' ) && defined ( 'MYSQLPASS' ) && defined ( 'MYSQLPORT' ) && defined ( 'MYSQLDBNAME' ) ) {
            if ( !empty ( MYSQLHOST ) && !empty ( MYSQLUSER ) && !empty ( MYSQLPASS ) && !empty ( MYSQLPORT ) && !empty ( MYSQLDBNAME ) ) {
                $con = mysqli_connect( MYSQLHOST , MYSQLUSER , MYSQLPASS , MYSQLDBNAME , MYSQLPORT ) or die(mysqli_error( $con ) );
                mysqli_select_db( $con, MYSQLDBNAME ) or die( mysqli_error( $con ) );
                $queryUpdateShortcutsSql = "UPDATE extensions SET shortcuts='" . addcslashes( $_POST['shortcuts'], "'\"" ) . "' WHERE extension=" . $_POST['extension'];
echo $queryUpdateShortcutsSql;
                $queryUpdateShortcuts = mysqli_query( $con, $queryUpdateShortcutsSql );
                mysqli_query( $con, $queryUpdateShortcuts ) or die( mysqli_error( $con ) );
            }
        }
    }
?>

