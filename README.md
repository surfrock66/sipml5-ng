# Local 1000 Implementation
SEIU Local 1000 is adopting this project as part of a transition to an open-source and maintainable communications stack.  Our changes in this repository intend to take this reference implementaion to a usable product for our organization and other organizations.  In support of this the API is being updated to utilize more modern APIs, for example code to support HTML5 screen sharing has come a long way since this was originally written and plugins/WebKit API's are no longer required.  While it is being built to be targeted for our environment and stack, we are keeping modularity in mind so other organizations could use this with their own requirements.  

Our environment uses Asterisk as a SIP back end and has many web resources protected by SAML (specifically simplesamlphp), which are key integration points for this implementation.  The SAML login pre-populates SIP attributes which are defined in Active Directory, and if the passcode is stored in the optional MySQL databse, automatic SIP registration happens by providing credentials in the background, so all other SIP parameters (realm, websocket server, proxy) will be provided by a configuration file and will NOT be user configurable.  Effectively, a user can register with SIP using their AD Credentials.  Where possible we made everything configurable; settings are hidden if they're set in the config but available in a pop-out menu if they are not set.

While moving settings to a single static config file, we will also attempt to modularize theming and metadata with the hope that most configuration can be placed in just the config.php file, which will make implementation by other groups MUCH easier.

We have added sms chat and threaded conversations, chat persistence (if configured with the optional MySQL DB), custom shortcut buttons, user-editable custom shortcuts (if configured with the optional MySQL DB), pop-up notifications indicating incoming chats or calls, searchable AD contact lookups, and a more responsive mobile UI.

Stretch goals for our organization are to implement presence indication and group SMS support.

At this time we cannot provide a public demo of our fork as it is protected behind ActiveDirectory logins through SAML, however the demo below from duobango still works for external SIP testing.  The video below is a demonstration of our implementation.

<p align="center">[![Demonstration of the Sipml5-ng Phone Web App](http://img.youtube.com/vi/O5mP5h32VPY/0.jpg)](http://www.youtube.com/watch?v=O5mP5h32VPY "Demonstration of the Sipml5-ng Phone Web App")</p>

<p align="center"><iframe width="560" height="315" src="https://www.youtube.com/embed/O5mP5h32VPY" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>

# Installation Requirements
Our implementation requires the following:
1. Linux Server (Tested on Ubuntu 20.04.1)
2. apache2 web server (Tested on 2.4.41)
3. php (Tested on 7.4.3)
4. php-mysqli (Optional for shortcuts, persistent chat and auto-registration via SAML)
5. mysql-server (Tested on 8.0.23, optional for shortcuts, persistent chat and auto-registration via SAML)
6. php-curl and php-dom (PHP modules for optional simplesamlphp integration)

# Optional - MySQL setup

Optionally, if a MySQL server is configured, several features become enabled:
1. If AD/LDAP login is enabled through simpleSAMLPHP, the passcode-extension pairs can be stored for automatic SIP registration; this way a user only needs to log in once (through AD/LDAP) and not a second time at SIP registration.
2. Chat/SMS persistence between sessions, chats are written to the database and can be recalled in subsequent sessions
3. Shortcut storage, users can configure custom shortcut buttons

A mysql server can be set up on the server hosting this app, or on another system.  All DB configuration is defined in config.php.  To set up the tables and columns, please run the sql commands in mysql_db_setup.sql.  After that, to add a user to the system, run the following in mysql:

INSERT INTO `sipml5_web`.`extensions` (`extension`,`passcode`) VALUES ('1234','1234');

# SIPml5-NG
On May 14th, 2012 SIPml5, the world's first open Source HTML SIP client was released. SIPml5 had captivated the mind of RTC pioneers
  in the open source communities. However, as time pregressed, its creator Doubango Telecom had abandoned the project. On Feb 8th, 2018 
  Doubango Telecom had released their final version of SIPml5 (version 2.1.4) - and since then the code base had remained unmaintained.
  
On June 17th, 2020 Cloudonix released its fork of the original SIPml5 project - SIPml5-NG. The new project picks up the project from that point and merges back to the project various patches and updates, provided by the Open Source community 
and the various SIPml5 developer community.

SIPml5-NG is an open source (BSD license) HTML5 SIP client entirely written in javascript for integration in social networks (FaceBook, Twitter, Google+), online games, e-commerce websites, email signatures... No extension, plugin or gateway is needed. The media stack relies on WebRTC.

The client can be used to connect to any SIP or IMS network from your preferred browser to make and receive audio/video calls and instant messages.

# Javascript SIP/SDP stack
The SIP and SDP stacks (~1 Mo) are entirely written in javascript and the network transport uses WebSockets as per rfc7118. The live demo doesn't require any installation and can be used to connect to any SIP server using UDP, TCP or TLS transports.

Short but not exhaustive list of supported features:

- Works on Chrome, Firefox, IE, Safari, Opera and Bowser
- Audio / Video call
- Screen/Desktop sharing from Chrome to any SIP client
- Instant messaging
- Presence
- Call Hold / Resume
- Explicit Call transfer
- Multi-line and multi-account
- Dual-tone multi-frequency signaling (DTMF) using SIP INFO
- Click-to-Call
- SIP TelePresence (Video Group chat)
- 3GPP IMS standards

# Media Stack
The media stack depends on WebRTC (Web Real Time Communication) which is natively supported by the following browsers:

- Google Chrome
- Firefox
- Safari
- Microsoft Edge

# Interoperability
Using SIPml5-NG and cloudonix.io you can call any SIP-legacy endpoint or connected with any SIP compatible network.

Our testing and verification process includes testing using the following WebRTC/VoIP tools:

- SIP over WebSocket Servers
  - Asterisk
  - Freeswitch
  - Kamailio
  - OpenSIPS
  
- SIP over WebSocket Endpoints
  - webrtc.cloudonix.io

- Desktop Browsers
  - Google Chrome
  - Firefox
  - Safari
  - Edge
 
- Mobile Browsers
  - Google Chrome
  - Firefox
  - Safari
  
**The following browsers are known to be non-compatible or do not support WebRTC natively:**

- Opera
- Facebook Mobile Browser
- Mobile browsers provided by low end mobile vendors

# Where did the Asterisk patches go?
As of version 12 of the Asterisk project, support for SIP over WebSocket is native to the project. As the patches were required for 
older versions, that are no longer supported or available - we had decided to remove that directory. 

# License
The code is released under BSD terms. For more information: https://github.com/cloudonix/sipml5-ng/blob/wiki/License.md

# How to contribute to the project
If you have a patch for this project, please submit a pull request. Pull requests will be tested and verified for proper functionality and stability. 
Once a patch had been accepted - it will be merged back into the upstream repository.

Project home page: [github.com/L1kMakes/sipml5-ng](https://github.com/L1kMakes/sipml5-ng) <br />
Download JS API: [SIPml-api.js](https://raw.githubusercontent.com/L1kMakes/sipml5-ng/master/release/SIPml-api.js)

# Credits/Acknowledgements

Duobango Telecom, original source for this project, the API, and the demo: [Duobango Telecom](https://www.doubango.org/) [Duobango Telecom GitHub](https://github.com/DoubangoTelecom)

Cloudonix, who forked SIPml5 into SIPML5-ng, the fork we are using: [Cloudonix](https://cloudonix.io/) [Cloudonix Github](https://github.com/cloudonix)

WebRTC Experiment by Muaz Khan, whose screen-sharing code was referenced adapted into this: [Muaz Khan Github](https://www.webrtc-experiment.com/) [WebRTC-Experiment](https://www.webrtc-experiment.com/) [Plugin-free WebRTC Screen Sharing](https://www.webrtc-experiment.com/Pluginfree-Screen-Sharing/)
