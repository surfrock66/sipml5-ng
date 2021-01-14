
        <footer class="footer fixed-bottom">
            <div class="container">
                <p class="text-muted text-center"><small>&copy; SEIU Local 1000 - <?php echo date("Y"); ?>. All Rights Reserved.</small></p>
            </div>
            <!-- Creates all ATL/COM objects right now
                Will open confirmation dialogs if not already done
            -->
            <!--object id="fakeVideoDisplay" classid="clsid:5C2C407B-09D9-449B-BB83-C39B7802A684" style="visibility:hidden;"> </object-->
            <!--object id="fakeLooper" classid="clsid:7082C446-54A8-4280-A18D-54143846211A" style="visibility:visible; width:0px; height:0px"> </object-->
            <!--object id="fakeSessionDescription" classid="clsid:DBA9F8E2-F9FB-47CF-8797-986A69A1CA9C" style="visibility:hidden;"> </object-->
            <!--object id="fakeNetTransport" classid="clsid:5A7D84EC-382C-4844-AB3A-9825DBE30DAE" style="visibility:hidden;"> </object-->
            <!--object id="fakePeerConnection" classid="clsid:56D10AD3-8F52-4AA4-854B-41F4D6F9CEA3" style="visibility:hidden;"> </object-->
            <object id="fakePluginInstance" classid="clsid:69E4A9D1-824C-40DA-9680-C7424A27B6A0" style="visibility:hidden;"> </object>

            <!--
                NPAPI  browsers: Safari, Opera and Firefox
            -->
            <!--embed id="WebRtc4npapi" type="application/w4a" width='1' height='1' style='visibility:hidden;' /-->
        </footer>
        <!-- Glass Panel -->
        <div id='divGlassPanel' class='glass-panel' style='visibility:hidden'></div>
        <!-- KeyPad Div -->
        <div id='divKeyPad' class='span2 well div-keypad' style="left:0px; top:0px; width:250; height:240; visibility:hidden">
            <table style="width: 100%; height: 100%">
                <tr>
                    <td>
                        <input type="button" style="width: 31%" class="btn btnDialpad" value="1" onclick="sipSendDTMF('1');" />
                        <input type="button" style="width: 31%" class="btn btnDialpad" value="2" onclick="sipSendDTMF('2');" />
                        <input type="button" style="width: 31%" class="btn btnDialpad" value="3" onclick="sipSendDTMF('3');" />
                    </td>
                </tr>
                <tr>
                    <td>
                        <input type="button" style="width: 31%" class="btn btnDialpad" value="4" onclick="sipSendDTMF('4');" />
                        <input type="button" style="width: 31%" class="btn btnDialpad" value="5" onclick="sipSendDTMF('5');" />
                        <input type="button" style="width: 31%" class="btn btnDialpad" value="6" onclick="sipSendDTMF('6');" />
                    </td>
                </tr>
                <tr>
                    <td>
                        <input type="button" style="width: 31%" class="btn btnDialpad" value="7" onclick="sipSendDTMF('7');" />
                        <input type="button" style="width: 31%" class="btn btnDialpad" value="8" onclick="sipSendDTMF('8');" />
                        <input type="button" style="width: 31%" class="btn btnDialpad" value="9" onclick="sipSendDTMF('9');" />
                    </td>
                </tr>
                <tr>
                    <td>
                        <input type="button" style="width: 31%" class="btn btnDialpad" value="*" onclick="sipSendDTMF('*');" />
                        <input type="button" style="width: 31%" class="btn btnDialpad" value="0" onclick="sipSendDTMF('0');" />
                        <input type="button" style="width: 31%" class="btn btnDialpad" value="#" onclick="sipSendDTMF('#');" />
                    </td>
                </tr>
                <tr>
                    <td colspan=3>
                        <input type="button" style="width: 100%" class="btn btn-medium btn-danger btnDialpad" value="close" onclick="closeKeyPad();" />
                    </td>
                </tr>
            </table>
        </div>
        <!-- Call button options -->
        <ul id="ulCallOptions" class="dropdown-menu" style="visibility:hidden">
            <li><a href="#" onclick='sipCall("call-audio");'>Audio</a></li>
            <li><a href="#" onclick='sipCall("call-audiovideo");'>Video</a></li>
            <li id='liScreenShare'><a href="#" onclick='sipShareScreen();'>Screen Share</a></li>
            <li class="divider"></li>
            <li><a href="#" onclick='uiDisableCallOptions();'><b>Disable these options</b></a></li>
        </ul>

        <!-- Le javascript
        ================================================== -->
        <!-- Placed at the end of the document so the pages load faster -->
<!--
        <script type="text/javascript" src="./assets/js/jquery.js"></script>
        <script type="text/javascript" src="./assets/js/bootstrap-transition.js"></script>
        <script type="text/javascript" src="./assets/js/bootstrap-alert.js"></script>
        <script type="text/javascript" src="./assets/js/bootstrap-modal.js"></script>
        <script type="text/javascript" src="./assets/js/bootstrap-dropdown.js"></script>
        <script type="text/javascript" src="./assets/js/bootstrap-scrollspy.js"></script>
        <script type="text/javascript" src="./assets/js/bootstrap-tab.js"></script>
        <script type="text/javascript" src="./assets/js/bootstrap-tooltip.js"></script>
        <script type="text/javascript" src="./assets/js/bootstrap-popover.js"></script>
        <script type="text/javascript" src="./assets/js/bootstrap-button.js"></script>
        <script type="text/javascript" src="./assets/js/bootstrap-collapse.js"></script>
        <script type="text/javascript" src="./assets/js/bootstrap-carousel.js"></script>
        <script type="text/javascript" src="./assets/js/bootstrap-typeahead.js"></script>
-->

        <!-- Audios -->
        <audio id="audio_remote" autoplay="autoplay"> </audio>
        <audio id="ringtone" loop src="./sounds/ringtone.wav"> </audio>
        <audio id="ringbacktone" loop src="./sounds/ringbacktone.wav"> </audio>
        <audio id="dtmfTone" src="./sounds/dtmf.wav"> </audio>

    </body>
</html>

