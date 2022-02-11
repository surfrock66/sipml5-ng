/*
* Copyright (C) 2012-2016 Doubango Telecom <http://www.doubango.org>
* License: BSD
* This file is part of Open Source sipML5 solution <http://www.sipml5.org>a
* 
* Modified 2021.03.03 by jgullo of SEIU Local 1000 as part of the effort
*  to modernize the HTML5 webRTC calls around media permissions, specifically
*  the camera, microphone, notification, and screen-sharing API's.
*/
// http://tools.ietf.org/html/draft-uberti-rtcweb-jsep-02
// JSEP00: webkitPeerConnection00 (http://www.w3.org/TR/2012/WD-webrtc-20120209/)
// JSEP01: webkitRTCPeerConnection (http://www.w3.org/TR/webrtc/), https://webrtc-demos.appspot.com/html/pc1.html
// Mozilla: http://mozilla.github.com/webrtc-landing/pc_test.html
// Contraints: https://webrtc-demos.appspot.com/html/constraints-and-stats.html
// Android: https://groups.google.com/group/discuss-webrtc/browse_thread/thread/b8538c85df801b40
// Canary 'muted': https://groups.google.com/group/discuss-webrtc/browse_thread/thread/8200f2049c4de29f
// Canary state events: https://groups.google.com/group/discuss-webrtc/browse_thread/thread/bd30afc3e2f43f6d
// DTMF: https://groups.google.com/group/discuss-webrtc/browse_thread/thread/1354781f202adbf9
// IceRestart: https://groups.google.com/group/discuss-webrtc/browse_thread/thread/c189584d380eaa97
// Video Resolution: https://code.google.com/p/chromium/issues/detail?id=143631#c9
// Webrtc-Everywhere: https://github.com/sarandogou/webrtc-everywhere
// Adapter.js: https://github.com/sarandogou/webrtc

tmedia_session_jsep.prototype = Object.create(tmedia_session.prototype);
tmedia_session_jsep01.prototype = Object.create(tmedia_session_jsep.prototype);

tmedia_session_jsep.prototype.o_pc = null;
tmedia_session_jsep.prototype.b_cache_stream = false;
tmedia_session_jsep.prototype.o_local_stream = null;
tmedia_session_jsep.prototype.o_sdp_jsep_lo = null;
tmedia_session_jsep.prototype.o_sdp_lo = null;
tmedia_session_jsep.prototype.b_sdp_lo_pending = false;
tmedia_session_jsep.prototype.o_sdp_json_ro = null;
tmedia_session_jsep.prototype.o_sdp_ro = null;
tmedia_session_jsep.prototype.b_sdp_ro_pending = false;
tmedia_session_jsep.prototype.b_sdp_ro_offer = false;
tmedia_session_jsep.prototype.s_answererSessionId = null;
tmedia_session_jsep.prototype.s_offererSessionId = null;
tmedia_session_jsep.prototype.ao_ice_servers = null;
tmedia_session_jsep.prototype.ao_webrtc_rtcconfiguration = null;
tmedia_session_jsep.prototype.o_bandwidth = { audio: undefined, video: undefined };
tmedia_session_jsep.prototype.o_video_size = { minWidth: undefined, minHeight: undefined, maxWidth: undefined, maxHeight: undefined };
tmedia_session_jsep.prototype.d_screencast_windowid = 0; // BFCP. #0 means entire desktop

tmedia_session_jsep.prototype.b_ro_changed = false;
tmedia_session_jsep.prototype.b_lo_held = false;
tmedia_session_jsep.prototype.b_ro_held = false;

tmedia_session_jsep.prototype.a_mid = [];

tmedia_session_jsep.prototype.o_timerIce = null;

//
//  JSEP
//

tmedia_session_jsep.prototype.CreateInstance = function (o_mgr) {
    return new tmedia_session_jsep01(o_mgr);
}

function tmedia_session_jsep(o_mgr) {
    tmedia_session.call(this, o_mgr.e_type, o_mgr);
}

tmedia_session_jsep.prototype.__set = function (o_param) {
    if (!o_param) {
        return -1;
    }
    switch (o_param.s_key) {
        case 'ice-servers':
            {
                this.ao_ice_servers = o_param.o_value;
                return 0;
            }
        case 'webrtc-rtcconfiguration':
            {
                this.ao_webrtc_rtcconfiguration = o_param.o_value;
                return 0;
            }
        case 'cache-stream':
            {
                this.b_cache_stream = !!o_param.o_value;
                return 0;
            }
        case 'bandwidth':
            {
                this.o_bandwidth = o_param.o_value;
                return 0;
            }
        case 'video-size':
            {
                this.o_video_size = o_param.o_value;
                return 0;
            }
        case 'screencast-windowid':
            {
                this.d_screencast_windowid = parseFloat(o_param.o_value.toString());
                if (this.o_pc && this.o_pc.setScreencastSrcWindowId) {
                    this.o_pc.setScreencastSrcWindowId(this.d_screencast_windowid);
                }
                return 0;
            }
        case 'mute-audio':
        case 'mute-video':
            {
                if (this.o_pc && typeof o_param.o_value == "boolean") {
                    if (this.o_pc.mute) {
                        this.o_pc.mute((o_param.s_key === 'mute-audio') ? "audio" : "video", o_param.o_value);
                    }
                    else if (this.o_local_stream) {
                        var tracks = (o_param.s_key === 'mute-audio') ? this.o_local_stream.getAudioTracks() : this.o_local_stream.getVideoTracks();
                        if (tracks) {
                            for (var i = 0; i < tracks.length; ++i) {
                                tracks[i].enabled = !o_param.o_value;
                            }
                        }
                    }
                }
            }
    }

    return -2;
}

tmedia_session_jsep.prototype.__prepare = function () {
    return 0;
}

tmedia_session_jsep.prototype.__set_media_type = function (e_type) {
    if (e_type != this.e_type) {
        this.e_type = e_type;
        this.o_sdp_lo = null;
    }
    return 0;
}

tmedia_session_jsep.prototype.__processContent = function (s_req_name, s_content_type, s_content_ptr, i_content_size) {
    if (this.o_pc && this.o_pc.processContent) {
        this.o_pc.processContent(s_req_name, s_content_type, s_content_ptr, i_content_size);
        return 0;
    }
    return -1;
}

tmedia_session_jsep.prototype.__send_dtmf = function (s_digit) {
    if (this.o_pc && this.o_pc.sendDTMF) {
        this.o_pc.sendDTMF(s_digit);
        return 0;
    }
    return -1;
}

tmedia_session_jsep.prototype.__start = function () {
    if (this.o_local_stream && this.o_local_stream.start) {
        // cached stream would be stopped in close()
        this.o_local_stream.start();
    }
    return 0;
}

tmedia_session_jsep.prototype.__pause = function () {
    if (this.o_local_stream && this.o_local_stream.pause) {
        this.o_local_stream.pause();
    }
    return 0;
}

tmedia_session_jsep.prototype.__stop = function () {
    this.close();
    this.o_sdp_lo = null;
    tsk_utils_log_info("PeerConnection::stop()");

    return 0;
}

tmedia_session_jsep.prototype.decorate_lo = function () {
    if (this.o_sdp_lo) {
        /* Session name for debugging - Requires by webrtc2sip to set RTCWeb type */
        var o_hdr_S;
        if ((o_hdr_S = this.o_sdp_lo.get_header(tsdp_header_type_e.S))) {
            o_hdr_S.s_value = "Doubango/Cloudonix/SEIULocal1000 WebRTC Client - " + tsk_utils_get_navigator_friendly_name();
        }

        // BUGFIX: [asterisk] remove first a=sendrecv
        var o_hdr_A;
        if ( this.b_lo_held && (o_hdr_A = this.o_sdp_lo.get_header_a('sendrecv'))) {
            //o_hdr_A.s_field = 'sendonly';
            this.o_sdp_lo.remove_header_by_type_field(tsdp_header_type_e.A, 'sendrecv');
        }

        /* Remove 'video' media if not enabled (bug in chrome: doesn't honor 'has_video' parameter) */
        if (!(this.e_type.i_id & tmedia_type_e.VIDEO.i_id)) {
            this.o_sdp_lo.remove_media("video");
        }
        /* hold / resume, profile, bandwidth... */
        var i_index = 0;
        var o_hdr_M;
        var b_fingerprint = !!this.o_sdp_lo.get_header_a("fingerprint"); // session-level fingerprint
        var o_hdr_A;
        while ((o_hdr_M = this.o_sdp_lo.get_header_at(tsdp_header_type_e.M, i_index++))) {

            // save Mid
            if (o_hdr_A = o_hdr_M.find_a("mid")) {
                this.a_mid[i_index] = o_hdr_A.s_value;
            }

            // hold/resume
            o_hdr_M.set_holdresume_att(this.b_lo_held, this.b_ro_held);

            if (b_fingerprint || o_hdr_M.find_a("fingerprint")) {
                o_hdr_M.s_proto = "UDP/TLS/RTP/SAVPF";
            }

            // HACK: https://bugzilla.mozilla.org/show_bug.cgi?id=1072384
            if (o_hdr_M.o_hdr_C && o_hdr_M.o_hdr_C.s_addr === "0.0.0.0") {
                o_hdr_M.o_hdr_C.s_addr = "127.0.0.1";
            }

            // bandwidth
            if (this.o_bandwidth) {
                if (this.o_bandwidth.audio && o_hdr_M.s_media.toLowerCase() == "audio") {
                    o_hdr_M.add_header(new tsdp_header_B("AS:" + this.o_bandwidth.audio));
                }
                else if (this.o_bandwidth.video && o_hdr_M.s_media.toLowerCase() == "video") {
                    o_hdr_M.add_header(new tsdp_header_B("AS:" + this.o_bandwidth.video));
                }
            }
        }
    }
    return 0;
}

tmedia_session_jsep.prototype.decorate_ro = function (b_remove_bundle) {
    if (this.o_sdp_ro) {
        var o_hdr_M, o_hdr_A;
        var i_index = 0, i;

        // FIXME: Chrome fails to parse SDP with global SDP "a=" attributes
        // Chrome 21.0.1154.0+ generate "a=group:BUNDLE audio video" but cannot parse it
        // In fact, new the attribute is left the ice callback is called twice and the 2nd one trigger new INVITE then 200OK. The SYN_ERR is caused by the SDP in the 200 OK.
        // Is it because of "a=rtcp:1 IN IP4 0.0.0.0"?
        if (b_remove_bundle) {
            this.o_sdp_ro.remove_header(tsdp_header_type_e.A);
        }

        // ==== START: RFC5939 utility functions ==== //
        var rfc5939_get_acap_part = function (o_hdr_a, i_part/* i_part = 1: field, 2: value*/) {
            var ao_match = o_hdr_a.s_value.match(/^\d\s+(\w+):([\D|\d]+)/i);
            if (ao_match && ao_match.length == 3) {
                return ao_match[i_part];
            }
        }
        var rfc5939_acap_ensure = function (o_hdr_a) {
            if (o_hdr_a && o_hdr_a.s_field == "acap") {
                o_hdr_a.s_field = rfc5939_get_acap_part(o_hdr_a, 1);
                o_hdr_a.s_value = rfc5939_get_acap_part(o_hdr_a, 2);
            }
        }
        var rfc5939_get_headerA_at = function (o_msg, s_media, s_field, i_index) {
            var i_pos = 0;
            var get_headerA_at = function (o_sdp, s_field, i_index) {
                if (o_sdp) {
                    var ao_headersA = (o_sdp.ao_headers || o_sdp.ao_hdr_A);
                    for (var i = 0; i < ao_headersA.length; ++i) {
                        if (ao_headersA[i].e_type == tsdp_header_type_e.A && ao_headersA[i].s_value) {
                            var b_found = (ao_headersA[i].s_field === s_field);
                            if (!b_found && ao_headersA[i].s_field == "acap") {
                                b_found = (rfc5939_get_acap_part(ao_headersA[i], 1) == s_field);
                            }
                            if (b_found && i_pos++ >= i_index) {
                                return ao_headersA[i];
                            }
                        }
                    }
                }
            }

            var o_hdr_a = get_headerA_at(o_msg, s_field, i_index); // find at session level
            if (!o_hdr_a) {
                return get_headerA_at(o_msg.get_header_m_by_name(s_media), s_field, i_index); // find at media level
            }
            return o_hdr_a;
        }
        // ==== END: RFC5939 utility functions ==== //


        var find_and_insert_after = function (o_header, s_field, o_insert) {
            if (! o_header.ao_hdr_A) {
                return -1;
            }
            for(var i = 0; i < o_header.ao_hdr_A.length; ++i){
                if(o_header.ao_hdr_A[i].s_field == s_field){
                    o_header.ao_hdr_A.splice((i + 1), 0, o_insert);
                    return i;
                }
            }
        }

        // change profile if not secure
        //!\ firefox nighly: DTLS-SRTP only, chrome: SDES-SRTP
        var b_fingerprint = !!this.o_sdp_ro.get_header_a("fingerprint"); // session-level fingerprint
        while ((o_hdr_M = this.o_sdp_ro.get_header_at(tsdp_header_type_e.M, i_index++))) {
            // https://support.mozilla.org/en-US/questions/1234227
            // https://www.fxsitecompat.com/en-CA/docs/2018/webrtc-sdp-offer-now-requires-mid-property/
            if ((! o_hdr_M.find_a("mid")) && (this.a_mid[i_index]) )  {
              find_and_insert_after(o_hdr_M, "setup", new tsdp_header_A("mid:" + this.a_mid[i_index]))
            }

            // check for "crypto:"/"fingerprint:" lines (event if it's not valid to provide "crypto" lines in non-secure SDP many clients do it, so, just check)
            if (o_hdr_M.s_proto.indexOf("SAVP") < 0) {
                if (o_hdr_M.find_a("crypto")) {
                    o_hdr_M.s_proto = "RTP/SAVPF";
                    break;
                }
                else if (b_fingerprint || o_hdr_M.find_a("fingerprint")) {
                    o_hdr_M.s_proto = "UDP/TLS/RTP/SAVPF";
                    break;
                }
            }

            // rfc5939: "acap:fingerprint,setup,connection"
            if (o_hdr_M.s_proto.indexOf("SAVP") < 0) {
                if ((o_hdr_A = rfc5939_get_headerA_at(this.o_sdp_ro, o_hdr_M.s_media, "fingerprint", 0))) {
                    rfc5939_acap_ensure(o_hdr_A);
                    if ((o_hdr_A = rfc5939_get_headerA_at(this.o_sdp_ro, o_hdr_M.s_media, "setup", 0))) {
                        rfc5939_acap_ensure(o_hdr_A);
                    }
                    if ((o_hdr_A = rfc5939_get_headerA_at(this.o_sdp_ro, o_hdr_M.s_media, "connection", 0))) {
                        rfc5939_acap_ensure(o_hdr_A);
                    }
                    o_hdr_M.s_proto = "UDP/TLS/RTP/SAVP";
                }
            }
            // rfc5939: "acap:crypto". Only if DTLS is OFF
            if (o_hdr_M.s_proto.indexOf("SAVP") < 0) {
                i = 0;
                while ((o_hdr_A = rfc5939_get_headerA_at(this.o_sdp_ro, o_hdr_M.s_media, "crypto", i++))) {
                    rfc5939_acap_ensure(o_hdr_A);
                    o_hdr_M.s_proto = "RTP/SAVPF";
                    // do not break => find next "acap:crypto" lines and ensure them
                }
            }

            // HACK: Nightly 20.0a1 uses RTP/SAVPF for DTLS-SRTP which is not correct. More info at https://bugzilla.mozilla.org/show_bug.cgi?id=827932
            // Same for chrome: https://code.google.com/p/sipml5/issues/detail?id=92
            if (o_hdr_M.s_proto.indexOf("UDP/TLS/RTP/SAVP") != -1) {
                o_hdr_M.s_proto = "RTP/SAVPF";
            }
        }
    }
    return 0;
}

tmedia_session_jsep.prototype.subscribe_stream_events = function () {
    if (this.o_pc) {
        var This = (tmedia_session_jsep01.mozThis || this);
        this.o_pc.ontrack = function (evt) {
           tsk_utils_log_info("__on_track");
            This.o_remote_stream = evt.streams[0];
           if (This.o_mgr) {
               This.o_mgr.set_stream_remote(evt.streams[0]);
           }
        }
        this.o_pc.onremovestream = function (evt) {
            tsk_utils_log_info("__on_remove_stream");
            This.o_remote_stream = null;
            if (This.o_mgr) {
                This.o_mgr.set_stream_remote(null);
            }
        }
    }
}

tmedia_session_jsep.prototype.close = function () {
    if (this.o_mgr) { // 'onremovestream' not always called
        this.o_mgr.set_stream_remote(null);
        this.o_mgr.set_stream_local(null);
    }
    if (this.o_pc) {
        if (this.o_local_stream) {
            // TODO: On Firefox 26: Error: "removeStream not implemented yet"
            //try { this.o_pc.removeStream(this.o_local_stream); } catch (e) { tsk_utils_log_error(e); }
            if (!this.b_cache_stream || (this.e_type == tmedia_type_e.SCREEN_SHARE)) { // only stop if caching is disabled or screenshare
                try {
                    var tracks = this.o_local_stream.getTracks();
                    for (var track in tracks) {
                        tracks[track].stop();
                    }
                } catch (e) { tsk_utils_log_error(e); }
                try { this.o_local_stream.stop(); } catch (e) { } // Deprecated in Chrome 45: https://github.com/DoubangoTelecom/sipml5/issues/231
            }
            this.o_local_stream = null;
        }
        this.o_pc.close();
        this.o_pc = null;
        this.b_sdp_lo_pending = false;
        this.b_sdp_ro_pending = false;
    }
}

tmedia_session_jsep.prototype.__acked = function () {
    return 0;
}

tmedia_session_jsep.prototype.__hold = function () {
    if (this.b_lo_held) {
        // tsk_utils_log_warn('already on hold');
        return;
    }
    var This = this;

    this.b_lo_held = true;

    this.o_sdp_ro = null;
    this.o_sdp_lo = null;

    this.b_sdp_lo_pending = true;
    this.b_sdp_ro_pending = true;

    if (this.o_pc && this.o_local_stream) {

        this.o_pc.getSenders().forEach(function(sender){
            This.o_local_stream.getTracks().forEach(function(track){
                if(track == sender.track){
                    This.o_pc.removeTrack(sender);
                    tsk_utils_log_info('This.o_pc.removeTrack(sender)');
                }
            })
        });
    }
    return 0;
}

tmedia_session_jsep.prototype.__resume = function () {
    if (!this.b_lo_held) {
        // tsk_utils_log_warn('not on hold');
        return;
    }
    var This = this;

    this.b_lo_held = false;

    this.o_sdp_lo = null;
    this.o_sdp_ro = null;

    this.b_sdp_lo_pending = true;
    this.b_sdp_ro_pending = true;

    if (this.o_pc && this.o_local_stream) {
	const sender = this.o_pc.getSenders()[0];
	const track = This.o_local_stream.getTracks()[0];
        sender.replaceTrack(track)
            .then(() => {
                tsk_utils_log_info('sender.replaceTrack(track)');
            })
            .catch( e => {
                tsk_utils_log_error(e);
            });
	this.o_pc.getTransceivers()[0].direction = "sendrecv";
    }
    return 0;
}

//
//  JSEP01
//

function tmedia_session_jsep01(o_mgr) {
    tmedia_session_jsep.call(this, o_mgr);
    this.o_rtc_offer_options =
    {
        'mandatory': {
            'OfferToReceiveAudio': !!(this.e_type.i_id & tmedia_type_e.AUDIO.i_id),
            'OfferToReceiveVideo': !!(this.e_type.i_id & tmedia_type_e.VIDEO.i_id)
        },
        // optional: [
        //     { DtlsSrtpKeyAgreement: true }
        // ],
    };

    if (tsk_utils_get_navigator_friendly_name() == 'firefox') {
        this.o_rtc_offer_options['offerToReceiveAudio'] = !!(this.e_type.i_id & tmedia_type_e.AUDIO.i_id);
        this.o_rtc_offer_options['offerToReceiveVideo'] = !!(this.e_type.i_id & tmedia_type_e.VIDEO.i_id);
        this.o_rtc_offer_options['iceRestart'] = true;
    }

}

tmedia_session_jsep01.mozThis = undefined;

tmedia_session_jsep01.onGetUserMediaSuccess = function (o_stream, _This) {
    tsk_utils_log_info("onGetUserMediaSuccess");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (This && This.o_pc && This.o_mgr) {
        if (!This.b_sdp_lo_pending) {
            tsk_utils_log_warn("onGetUserMediaSuccess but no local sdp request is pending");
            return;
        }

        if (o_stream && !This.b_ro_held) {
            // save stream other next calls
            if (o_stream.getAudioTracks().length > 0 && o_stream.getVideoTracks().length == 0) {
                __o_jsep_stream_audio = o_stream;
            }
            else if (o_stream.getAudioTracks().length > 0 && o_stream.getVideoTracks().length > 0) {
                __o_jsep_stream_audiovideo = o_stream;
            }
            else if (o_stream.getAudioTracks().length == 0 && o_stream.getVideoTracks().length > 0) {
                __o_jsep_stream_audiovideo = o_stream;
            }

            if (!This.o_local_stream) {
                This.o_mgr.callback(tmedia_session_events_e.STREAM_LOCAL_ACCEPTED, this.e_type);
            }

            // HACK: Firefox only allows to call gum one time
            if (tmedia_session_jsep01.mozThis) {
                __o_jsep_stream_audiovideo = __o_jsep_stream_audio = o_stream;
            }

            This.o_local_stream = o_stream;
            This.o_pc.addStream(o_stream);
        }
        else {
            // Probably call held
        }

        This.o_mgr.set_stream_local(o_stream);

        var b_answer = ((This.b_sdp_ro_pending || This.b_sdp_ro_offer) && (This.o_sdp_ro != null));
        if (b_answer) {
            This.__set_ro(This.o_sdp_ro, true);

            tsk_utils_log_info("createAnswer");
            This.o_pc.createAnswer(
              This.o_rtc_offer_options
            ).then(
                tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onCreateSdpSuccess : function (o_offer) { tmedia_session_jsep01.onCreateSdpSuccess(o_offer, This); },
                tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onCreateSdpError : function (s_error) { tmedia_session_jsep01.onCreateSdpError(s_error, This); }
             );
        }
        else {
            // FIXME: hold offer
            var o_tmp_rtc_offer_options = Object.assign({}, This.o_rtc_offer_options);
            if (This.b_lo_held) {
                o_tmp_rtc_offer_options['mandatory']['OfferToReceiveAudio'] = false;
                if (tsk_utils_get_navigator_friendly_name() == 'firefox') {
                    o_tmp_rtc_offer_options['offerToReceiveAudio'] = false;
                }
            }
            tsk_utils_log_info("createOffer");
            This.o_pc.createOffer(
              o_tmp_rtc_offer_options
            ).then(
              tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onCreateSdpSuccess : function (o_offer) { tmedia_session_jsep01.onCreateSdpSuccess(o_offer, This); },
              tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onCreateSdpError : function (s_error) { tmedia_session_jsep01.onCreateSdpError(s_error, This); }
            );
        }
    }
}

tmedia_session_jsep01.onGetUserMediaError = function (s_error, _This) {
    tsk_utils_log_info("onGetUserMediaError");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (This && This.o_mgr) {
        tsk_utils_log_error(s_error);
        This.o_mgr.callback(tmedia_session_events_e.STREAM_LOCAL_REFUSED, This.e_type);
    }
}

tmedia_session_jsep01.onCreateSdpSuccess = function (o_sdp, _This) {
    tsk_utils_log_info("onCreateSdpSuccess");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (This && This.o_pc) {
        This.o_pc.setLocalDescription(o_sdp)
            .then(
                tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onSetLocalDescriptionSuccess : function () { tmedia_session_jsep01.onSetLocalDescriptionSuccess(This);}
            )
            .catch(
                tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onSetLocalDescriptionError : function (s_error) { tmedia_session_jsep01.onSetLocalDescriptionError(s_error, This);}
            )
    }
}

tmedia_session_jsep01.onCreateSdpError = function (s_error, _This) {
    tsk_utils_log_info("onCreateSdpError");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (This && This.o_mgr) {
        tsk_utils_log_error(s_error);
        This.o_mgr.callback(tmedia_session_events_e.GET_LO_FAILED, This.e_type);
    }
}

tmedia_session_jsep01.onSetLocalDescriptionSuccess = function (_This) {
    tsk_utils_log_info("onSetLocalDescriptionSuccess");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (This && This.o_pc) {
        if ((This.o_pc.iceGatheringState || This.o_pc.iceState) === "complete") {
           tmedia_session_jsep01.onIceGatheringCompleted(This);
        }
        This.b_sdp_ro_offer = false; // reset until next incoming RO
    }
}

tmedia_session_jsep01.onSetLocalDescriptionError = function (s_error, _This) {
    tsk_utils_log_info("onSetLocalDescriptionError");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (This && This.o_mgr) {
        tsk_utils_log_error(s_error.toString());
        This.o_mgr.callback(tmedia_session_events_e.GET_LO_FAILED, This.e_type);
    }
}

tmedia_session_jsep01.onSetRemoteDescriptionSuccess = function (_This) {
    tsk_utils_log_info("onSetRemoteDescriptionSuccess");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (This) {
        if (!This.b_sdp_ro_pending && This.b_sdp_ro_offer) {
            This.o_sdp_lo = null; // to force new SDP when get_lo() is called
        }
    }
}

tmedia_session_jsep01.onSetRemoteDescriptionError = function (s_error, _This) {
    tsk_utils_log_info("onSetRemoteDescriptionError");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (This) {
        This.o_mgr.callback(tmedia_session_events_e.SET_RO_FAILED, This.e_type);
        tsk_utils_log_error(s_error);
    }
}

tmedia_session_jsep01.onIceGatheringCompleted = function (_This) {
    tsk_utils_log_info("onIceGatheringCompleted");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (This && This.o_pc) {

        if (This.o_timerIce) {
            tsk_utils_log_info('Clear This.o_timerIce', This.o_timerIce)
            clearTimeout(This.o_timerIce);
            This.o_timerIce = null;
        }

        if (!This.b_sdp_lo_pending) {
            tsk_utils_log_warn("onIceGatheringCompleted but no local sdp request is pending");
            return;
        }
        This.b_sdp_lo_pending = false;
        // HACK: Firefox Nightly 20.0a1(2013-01-08): PeerConnection.localDescription has a wrong value (remote sdp). More info at https://bugzilla.mozilla.org/show_bug.cgi?id=828235
        var localDescription = (This.localDescription || This.o_pc.localDescription);
        if (localDescription) {
            This.o_sdp_jsep_lo = localDescription;
            This.o_sdp_lo = tsdp_message.prototype.Parse(This.o_sdp_jsep_lo.sdp);
            This.decorate_lo();
            if (This.o_mgr) {
                This.o_mgr.callback(tmedia_session_events_e.GET_LO_SUCCESS, This.e_type);
            }
        }
        else {
            This.o_mgr.callback(tmedia_session_events_e.GET_LO_FAILED, This.e_type);
            tsk_utils_log_error("localDescription is null");
        }
    }
}

tmedia_session_jsep01.onIceCandidate = function (o_event, _This) {
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (!This || !This.o_pc) {
        tsk_utils_log_error("This/PeerConnection is null: unexpected");
        return;
    }

    var iceState = (This.o_pc.iceGatheringState || This.o_pc.iceState);
    tsk_utils_log_info("onIceCandidate = " + iceState);

    if ( !This.o_timerIce && This.b_sdp_lo_pending) {
        This.o_timerIce  = setTimeout( function () {
            tsk_utils_log_info("ICE GATHERING COMPLETE BY TIMEOUT");
            tmedia_session_jsep01.onIceGatheringCompleted(This)
        }, 2000);
    }
    // this disables trickle ice
    // https://muaz-khan.blogspot.com/2015/01/disable-ice-trickling.html
    if ((o_event && !o_event.candidate)) {
        tsk_utils_log_info("ICE GATHERING COMPLETED");
        tmedia_session_jsep01.onIceGatheringCompleted(This);
    }
    else if (This.o_pc.iceState === "failed") {
        tsk_utils_log_error("Ice state is 'failed'");
        if (This.o_timerIce) { clearTimeout(This.o_timerIce); This.o_timerIce = null; }
        This.o_mgr.callback(tmedia_session_events_e.GET_LO_FAILED, This.e_type);
    }
}

tmedia_session_jsep01.onIceConnectionStateChange = function (o_event, _This) {
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (!This || !This.o_pc) {
        tsk_utils_log_error("This/PeerConnection is null: unexpected");
        return;
    }

    var iceConnectionState = This.o_pc.iceConnectionState;

    tsk_utils_log_info("iceConnectionState = " + iceConnectionState);
}




tmedia_session_jsep01.onNegotiationNeeded = function (o_event, _This) {
    tsk_utils_log_info("onNegotiationNeeded");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (!This || !This.o_pc) {
        // do not raise error: could happen after pc.close()
        return;
    }
    if ((This.o_pc.iceGatheringState || This.o_pc.iceState) !== "new") {
        tmedia_session_jsep01.onGetUserMediaSuccess(This.b_lo_held ? null : This.o_local_stream, This);
    }
}

tmedia_session_jsep01.onSignalingstateChange = function (o_event, _This) {
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (!This || !This.o_pc) {
        // do not raise error: could happen after pc.close()
        return;
    }
    tsk_utils_log_info("onSignalingstateChange:" + This.o_pc.signalingState);

    // if (This.o_local_stream && This.o_pc.signalingState === "have-remote-offer") {
    //     tmedia_session_jsep01.onGetUserMediaSuccess(This.o_local_stream, This);
    // }
}


tmedia_session_jsep01.prototype.__get_lo = function () {
    var This = this;
    if (!this.o_pc && !this.b_lo_held) {

        var o_audio_constraints = {
            optional: []
        };

        // temporary hardcode googAutoGainControl off
        tsk_utils_log_info("About to set o_audio_constraints for " + tsk_utils_get_navigator_friendly_name() + " browser");
        if (tsk_utils_get_navigator_friendly_name() == 'chrome') {
          o_audio_constraints['optional'].push(
              { autoGainControl: SIPml.b_audio_constraint_auto_gain },
              { echoCancellation: SIPml.b_audio_constraint_echo_cancel },
              { noiseSuppression: SIPml.b_audio_constraint_noise_suppression }
           );
        }
        tsk_utils_log_info("o_audio_constraints is now:");
        tsk_utils_log_info(o_audio_constraints);

        var o_video_constraints = {
            mandatory: {},
            optional: []
        };
        if ( this.e_type.i_id == tmedia_type_e.SCREEN_SHARE.i_id ) {
            // Constraints for Screen Share go here
            //o_video_constraints.mandatory.chromeMediaSource = 'screen';
        }
        if (this.e_type.i_id & tmedia_type_e.VIDEO.i_id) {
            if (this.o_video_size) {
                if (this.o_video_size.minWidth) o_video_constraints.mandatory.minWidth = this.o_video_size.minWidth;
                if (this.o_video_size.minHeight) o_video_constraints.mandatory.minHeight = this.o_video_size.minHeight;
                if (this.o_video_size.maxWidth) o_video_constraints.mandatory.maxWidth = this.o_video_size.maxWidth;
                if (this.o_video_size.maxHeight) o_video_constraints.mandatory.maxHeight = this.o_video_size.maxHeight;
            }
            try { tsk_utils_log_info("Video Contraints:" + JSON.stringify(o_video_constraints)); } catch (e) { }
        }
        var o_iceServers = this.ao_ice_servers;
        if (!o_iceServers) { // defines default ICE servers only if none exist (because WebRTC requires ICE)
            // HACK Nightly 21.0a1 (2013-02-18):
            // - In RTCConfiguration passed to RTCPeerConnection constructor: FQDN not yet implemented (only IP-#s). Omitting "stun:stun.l.google.com:19302"
            // - CHANGE-REQUEST not supported when using "numb.viagenie.ca"
            // - (stun/ERR) Missing XOR-MAPPED-ADDRESS when using "stun.l.google.com"
            // numb.viagenie.ca: 66.228.45.110:
            // stun.l.google.com: 173.194.78.127
            // stun.counterpath.net: 216.93.246.18
            // "23.21.150.121" is the default STUN server used in Nightly
            o_iceServers = tmedia_session_jsep01.mozThis
                ? [{ url: 'stun:23.21.150.121:3478' }, { url: 'stun:216.93.246.18:3478' }, { url: 'stun:66.228.45.110:3478' }, { url: 'stun:173.194.78.127:19302' }]
                : [{ url: 'stun:stun.l.google.com:19302' }, { url: 'stun:stun.counterpath.net:3478' }, { url: 'stun:numb.viagenie.ca:3478' }];
        }
        try { tsk_utils_log_info("ICE servers:" + JSON.stringify(o_iceServers)); } catch (e) { }

        var b_isChrome = (tsk_utils_get_navigator_friendly_name() == 'chrome')

        var o_constraints = {};

        if (b_isChrome) {
            o_constraints['optional'] = [{'googIPv6': false}];
        }

        var o_RTCConfiguration = Object.assign({},
            {
                iceServers: (o_iceServers && !o_iceServers.length) ? null : o_iceServers,
                //sdpSemantics: "plan-b",
                // 2021.12.09 - The plan-b sdp formati is officially deprecated
                //  in favor of the unified plan, so we must account for it.
                sdpSemantics: "unified-plan",
                //iceCandidatePoolSize: b_isChrome ? 2 : 0 // experiment
            },

            this.ao_webrtc_rtcconfiguration
        );

        this.o_pc = new window.RTCPeerConnection(o_RTCConfiguration, o_constraints);

        this.o_pc.onicecandidate = tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onIceCandidate : function (o_event) { tmedia_session_jsep01.onIceCandidate(o_event, This); };
        this.o_pc.iceconnectionstatechange = tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onIceConnectionStateChange : function (o_event) { tmedia_session_jsep01.onIceConnectionStateChange(o_event, This); };
        this.o_pc.onnegotiationneeded = tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onNegotiationNeeded : function (o_event) { tmedia_session_jsep01.onNegotiationNeeded(o_event, This); };
        this.o_pc.onsignalingstatechange = tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onSignalingstateChange : function (o_event) { tmedia_session_jsep01.onSignalingstateChange(o_event, This); };

        this.subscribe_stream_events();
    }

    if (!this.o_sdp_lo && !this.b_sdp_lo_pending) {
        this.b_sdp_lo_pending = true;

        // set penfing ro if there is one
        if (this.b_sdp_ro_pending && this.o_sdp_ro) {
            this.__set_ro(this.o_sdp_ro, true);
        }
        // get media stream
        if (this.e_type == tmedia_type_e.AUDIO && (this.b_cache_stream && __o_jsep_stream_audio)) {
            tmedia_session_jsep01.onGetUserMediaSuccess(__o_jsep_stream_audio, This);
        }
        else if (this.e_type == tmedia_type_e.AUDIO_VIDEO && (this.b_cache_stream && __o_jsep_stream_audiovideo)) {
            tmedia_session_jsep01.onGetUserMediaSuccess(__o_jsep_stream_audiovideo, This);
        }
        else {
            if (!this.b_lo_held && !this.o_local_stream) {
                this.o_mgr.callback(tmedia_session_events_e.STREAM_LOCAL_REQUESTED, this.e_type);
                if ( this.e_type == tmedia_type_e.SCREEN_SHARE ) {
                    // Plugin-less screen share using WebRTC requires "getDisplayMedia" instead of "getUserMedia"
                    //  Because of this, audio constraints become limited, and we have to use async to deal with
                    //  the promise variable for the mediastream.  This is a change since Chrome 71.  We are able
                    //  to use the .then aspect of the promise to call a second mediaStream, then attach the audio
                    //  from that to the video of our second screenshare mediaStream, enabling plugin-less screen
                    //  sharing with audio.
                    let o_stream = null;
                    let o_streamAudio = null;
                    let o_streamVideo = null;
                    let o_streamAudioTrack = null;
                    let o_streamVideoTrack = null;

                    navigator.mediaDevices.getDisplayMedia(
                        {
                            audio: false,
                            video: !!( this.e_type.i_id & tmedia_type_e.VIDEO.i_id ) ? o_video_constraints : false
                        }
                    ).then( o_streamVideo => 
                        {
                            o_streamVideoTrack = o_streamVideo.getVideoTracks()[0];
                            navigator.mediaDevices.getUserMedia(
                                {
                                    audio: o_audio_constraints,
                                    video: false
                                }
                            ).then( o_streamAudio => 
                                {
                                    o_streamAudioTrack = o_streamAudio.getAudioTracks()[0];
                                    o_stream = new MediaStream( [ o_streamVideoTrack , o_streamAudioTrack ] );
                                    tmedia_session_jsep01.onGetUserMediaSuccess( o_stream, This );
                                }
                            ).catch( s_error => 
                                {
                                    tmedia_session_jsep01.onGetUserMediaError( s_error, This );
                                }
                            );
                        }
                    ).catch( s_error => 
                        {
                            tmedia_session_jsep01.onGetUserMediaError( s_error, This );
                        }
                    );
                } else {
                    navigator.mediaDevices.getUserMedia(
                        {
                            audio: (this.e_type == tmedia_type_e.SCREEN_SHARE) ? false : !!(this.e_type.i_id & tmedia_type_e.AUDIO.i_id) ? o_audio_constraints : false,
                            video: !!(this.e_type.i_id & tmedia_type_e.VIDEO.i_id) ? o_video_constraints : false // "SCREEN_SHARE" contains "VIDEO" flag -> (VIDEO & SCREEN_SHARE) = VIDEO
                        }
                    ).then( o_stream => 
                        {
                            tmedia_session_jsep01.onGetUserMediaSuccess( o_stream, This );
                        }
                    ).catch ( s_error => 
                        {
                            tmedia_session_jsep01.onGetUserMediaError( s_error, This );
                        }
                    );
                }
            }
        }
    }

    return this.o_sdp_lo;
}

tmedia_session_jsep01.prototype.__set_ro = function (o_sdp, b_is_offer) {
    if (!o_sdp) {
        tsk_utils_log_error("Invalid argument");
        return -1;
    }

    /* update remote offer */
    this.o_sdp_ro = o_sdp;
    this.b_sdp_ro_offer = b_is_offer;
    /* reset local sdp */
    if (b_is_offer) {
        this.o_sdp_lo = null;
    }

    if (this.o_pc) {
        try {
            var This = this;
            this.decorate_ro(false);
            tsk_utils_log_info("setRemoteDescription(" + (b_is_offer ? "offer)" : "answer)") + "\n" + this.o_sdp_ro);
            this.o_pc.setRemoteDescription(
               new window.RTCSessionDescription({ type: b_is_offer ? "offer" : "answer", sdp: This.o_sdp_ro.toString() })
            ).then (
                tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onSetRemoteDescriptionSuccess : function () { tmedia_session_jsep01.onSetRemoteDescriptionSuccess(This); }
            ).catch(
                tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onSetRemoteDescriptionError : function (s_error) { tmedia_session_jsep01.onSetRemoteDescriptionError(s_error, This); }
            )
        }
        catch (e) {
            tsk_utils_log_error(e);
            this.o_mgr.callback(tmedia_session_events_e.SET_RO_FAILED, this.e_type);
            return -2;
        }
        finally {
            this.b_sdp_ro_pending = false;
        }
    }
    else {
        this.b_sdp_ro_pending = true;
    }

    return 0;
}

