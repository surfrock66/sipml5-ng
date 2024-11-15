
        <footer class="footer fixed-bottom theme-bg-color">
            <div class="container">
<?php
$footerText = "";
if ( defined ( 'FOOTER' ) ) {
    if ( !empty ( FOOTER ) ) {
        $footerText = FOOTER . " - ";
    }
}
?>
                <p class="text-muted text-center"><small><?php echo $footerText.date("Y"); ?> | All Rights Reserved. | <a href="https://github.com/surfrock66/sipml5-ng">View This on GitHub</a></small></p>
            </div>
            <!-- Creates all ATL/COM objects right now
                Will open confirmation dialogs if not already done
            -->
            <!--object id="fakeVideoDisplay" classid="clsid:5C2C407B-09D9-449B-BB83-C39B7802A684" style="visibility:hidden;"> </object-->
            <!--object id="fakeLooper" classid="clsid:7082C446-54A8-4280-A18D-54143846211A" style="visibility:visible; width:0px; height:0px"> </object-->
            <!--object id="fakeSessionDescription" classid="clsid:DBA9F8E2-F9FB-47CF-8797-986A69A1CA9C" style="visibility:hidden;"> </object-->
            <!--object id="fakeNetTransport" classid="clsid:5A7D84EC-382C-4844-AB3A-9825DBE30DAE" style="visibility:hidden;"> </object-->
            <!--object id="fakePeerConnection" classid="clsid:56D10AD3-8F52-4AA4-854B-41F4D6F9CEA3" style="visibility:hidden;"> </object-->
            <!--<object id="fakePluginInstance" classid="clsid:69E4A9D1-824C-40DA-9680-C7424A27B6A0" style="visibility:hidden;"> </object>-->

            <!--
                NPAPI  browsers: Safari, Opera and Firefox
            -->
            <!--embed id="WebRtc4npapi" type="application/w4a" width='1' height='1' style='visibility:hidden;' /-->
        </footer>
        <!-- Glass Panel -->
        <div id='divGlassPanel' class='glass-panel' style='visibility:hidden'></div>
        <!-- Audios -->
        <audio id="audio_remote" autoplay="autoplay"> </audio>
        <audio id="ringtone" loop src=<?php if ( file_exists("./themes/".$themeName."/sounds/ringtone.wav") ) { echo "\"./themes/".$themeName."/sounds/ringtone.wav\""; } else { echo "\"./sounds/ringtone.wav\""; } ?>> </audio>
        <audio id="ringbacktone" loop src=<?php if ( file_exists("./themes/".$themeName."/sounds/ringbacktone.wav") ) { echo "\"./themes/".$themeName."/sounds/ringbacktone.wav\""; } else { echo "\"./sounds/ringbacktone.wav\""; } ?>> </audio>
        <audio id="dtmfTone" src=<?php if ( file_exists("./themes/".$themeName."/sounds/dtmf.wav") ) { echo "\"./themes/".$themeName."/sounds/dtmf.wav\""; } else { echo "\"./sounds/dtmf.wav\""; } ?>> </audio>
    </body>
</html>

