<?php
    // Load in config to set global constant variables
    require("../config.php");

    /*
    // The jist is php will populate an array of people and phone numbers
    //  which can be used to do contact lookup later in the app.
    // Since you can't do OU filtering from the php ldap module,
    //  there is a lot of logic to turn the php ldap results to 
    //  an array with just valid users that have numbers in AD.
    */
    // If LDAP settings exist, then we'll pull in the LDAP query code.
    if ( defined ( 'LDAPURI' ) && defined ( 'LDAPBINDUSER' ) && defined ( 'LDAPBINDPASS' ) && defined ( 'LDAPBASEDN' ) ) {
        if ( !empty ( LDAPURI ) && !empty ( LDAPBINDUSER ) && !empty ( LDAPBINDPASS ) && !empty ( LDAPBASEDN ) ) {
            $ldapuri = LDAPURI;
            $ldapbinduser = LDAPBINDUSER;
            $ldapbindpass = LDAPBINDPASS;
            $ldapbasedn = LDAPBASEDN;
            $ldap_connection = ldap_connect( $ldapuri );

            if (FALSE === $ldap_connection) {
                // Uh-oh, something is wrong...
                echo 'Unable to connect to the ldap server';
            }
 
            // We have to set this option for the version of Active Directory we are using.
            ldap_set_option($ldap_connection, LDAP_OPT_PROTOCOL_VERSION, 3) or die('Unable to set LDAP protocol version');
            ldap_set_option($ldap_connection, LDAP_OPT_REFERRALS, 0); // We need this for doing an LDAP search.
 
            if ( TRUE === ldap_bind ( $ldap_connection, $ldapbinduser, $ldapbindpass ) ) {
                //Get standard users and contacts
                $search_filter = '(&(objectCategory=person)(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))';

                $attr = array("dn","samaccountname","givenname","sn","title","department","telephonenumber","mobile");
 
                //Connect to LDAP
                $result = ldap_search($ldap_connection, $ldapbasedn, $search_filter, $attr);

                if (FALSE !== $result) {
                    $entries = ldap_get_entries($ldap_connection, $result);
 
                    // Uncomment the below if you want to write all entries to debug somethingthing 
                    //echo "<pre>";
                    //var_dump($entries);
                    //echo "</pre>";

                    $ADUsers = array();

                    //For each account returned by the search
                    for ($x = 0; $x < $entries['count']; $x++) {
                        //
                        //Retrieve values from Active Directory
                        //
         
                        //Distinguished Name
                        $LDAP_dn = "";
                        if (!empty($entries[$x]['dn'][0])) {
                            $LDAP_dn = $entries[$x]['dn'];
                            if ($LDAP_dn == "NULL") {
                                $LDAP_dn = "";
                            }
                        }

                        if ( ( strpos ( $LDAP_dn, 'Users' ) !== false ) && ( strpos ( $LDAP_dn, 'Inactive'  ) == false ) ) {

                            // Phone Number 
                            $LDAP_PhoneNumber = "";
                            if (!empty($entries[$x]['telephonenumber'][0])) {
                                $LDAP_PhoneNumber = $entries[$x]['telephonenumber'][0];
                                if ($LDAP_PhoneNumber == "NULL") {
                                    $LDAP_PhoneNumber = "";
                                }
                            }
 
                            //Mobile phone
                            $LDAP_MobilePhone = "";
                            if (!empty($entries[$x]['mobile'][0])) {
                                $LDAP_MobilePhone = $entries[$x]['mobile'][0];
                                if ($LDAP_MobilePhone == "NULL") {
                                    $LDAP_MobilePhone = "";
                                }
                            }

                            if ( ( $LDAP_PhoneNumber !== "" ) || ( $LDAP_MobilePhone !== "" ) ) {

                                //Windows Usernaame
                                $LDAP_samaccountname = "";
                                if (!empty($entries[$x]['samaccountname'][0])) {
                                    $LDAP_samaccountname = $entries[$x]['samaccountname'][0];
                                    if ($LDAP_samaccountname == "NULL") {
                                        $LDAP_samaccountname = "";
                                    }
                                } else {
                                    //#There is no samaccountname s0 assume this is an AD contact record so generate a unique username
                                    $LDAP_uSNCreated = $entries[$x]['usncreated'][0];
                                    $LDAP_samaccountname = "CONTACT_" . $LDAP_uSNCreated;
                                }
 
                                //Last Name
                                $LDAP_LastName = "";
                                if (!empty($entries[$x]['sn'][0])) {
                                    $LDAP_LastName = $entries[$x]['sn'][0];
                                    if ($LDAP_LastName == "NULL") {
                                        $LDAP_LastName = "";
                                    }
                                }
 
                                //First Name
                                $LDAP_FirstName = "";
                                if (!empty($entries[$x]['givenname'][0])) {
                                    $LDAP_FirstName = $entries[$x]['givenname'][0];
                                    if ($LDAP_FirstName == "NULL") {
                                        $LDAP_FirstName = "";
                                    }
                                }
 
                                //Department
                                $LDAP_Department = "";
                                if (!empty($entries[$x]['department'][0])) {
                                    $LDAP_Department = $entries[$x]['department'][0];
                                    if ($LDAP_Department == "NULL") {
                                        $LDAP_Department = "";
                                    }
                                }
 
                                //Job Title
                                $LDAP_JobTitle = "";
                                if (!empty($entries[$x]['title'][0])) {
                                    $LDAP_JobTitle = $entries[$x]['title'][0];
                                    if ($LDAP_JobTitle == "NULL") {
                                        $LDAP_JobTitle = "";
                                    }
                                }
                                if ( $LDAP_PhoneNumber !== "" ) {
                                    $userData = array($LDAP_LastName, $LDAP_FirstName, $LDAP_JobTitle, $LDAP_Department, $LDAP_PhoneNumber, "Phone #");
                                    array_push ( $ADUsers, $userData );
                                }
                                if ( $LDAP_MobilePhone !== "" ) {
                                    $userData = array($LDAP_LastName, $LDAP_FirstName, $LDAP_JobTitle, $LDAP_Department, $LDAP_MobilePhone, "Mobile #");
                                    array_push ( $ADUsers, $userData );
                                }
                            }
                        }
                    }

                    // Sort the results by last name, first name, and number type
                    $column_lastname = array_column ( $ADUsers, 1 );
                    $column_firstname = array_column ( $ADUsers, 0 );
                    $column_type = array_column ( $ADUsers, 5 );
                    array_multisort ( $column_lastname, SORT_ASC, $column_firstname, SORT_ASC, $column_type, SORT_DESC, $ADUsers  );

                    $contactLookup = array();

                    foreach( $ADUsers as $user ) {
                        $userData = array (
                            "lookupName" => $user[1] . " " . $user[0],
                            "displayText" => $user[0] . ", " . $user[1] . " - " . $user[2] . ", " . $user[3] . " - " . $user[5] . ": " . $user[4],
                            "number" => $user[4]
                        );
                        
                        array_push ( $contactLookup, $userData );
                    }
                    echo json_encode ( $contactLookup );
                }
            }
            ldap_unbind($ldap_connection); // Clean up after ourselves.
        } else {
            echo "";
        }
    } else {
        echo "";
    }
?>
