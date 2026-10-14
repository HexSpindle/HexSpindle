// User-Agent classification tables and detection. Order matters throughout: the first matching rule wins,
// so specific products come before the generic tokens they also carry (an Edge UA also says "Chrome" and "Safari").

// [name, pattern (first capture group = version), kind]
const CLIENTS = [
  // ---- Security scanners and attack tools --------------------------------------------------------
  ['sqlmap', /\bsqlmap\/?([\w.#-]*)/i, 'scanner'], ['Nikto', /\bNikto\/?([\w.]*)/i, 'scanner'], ['Nmap Scripting Engine', /Nmap Scripting Engine/i, 'scanner'],
  ['masscan', /\bmasscan\/?([\w.]*)/i, 'scanner'], ['ZGrab', /\bzgrab\/?([\w.]*)/i, 'scanner'], ['Nuclei', /\bNuclei\b(?: - Open-source project)?[ /(]*v?([\d.]*)/i, 'scanner'],
  ['WPScan', /\bWPScan v?([\w.]*)/i, 'scanner'], ['Acunetix', /\bacunetix/i, 'scanner'], ['Nessus', /\bNessus\b/i, 'scanner'], ['OpenVAS', /\bOpenVAS\b[ -]*(?:VT )?([\d.]*)/i, 'scanner'],
  ['Qualys', /\bQualys/i, 'scanner'], ['w3af', /\bw3af\b/i, 'scanner'], ['Arachni', /\bArachni\/v?([\w.]*)/i, 'scanner'], ['OWASP ZAP', /\b(?:OWASP[ _]ZAP|ZAP)\/([\w.]+)/i, 'scanner'],
  ['Burp Suite', /\bBurp(?:Suite)?\b/i, 'scanner'], ['Hydra', /\bHydra\b/i, 'scanner'], ['Wfuzz', /\bWfuzz\/([\w.]+)/i, 'scanner'], ['ffuf', /\bFuzz Faster U Fool v?([\w.]*)/i, 'scanner'],
  ['feroxbuster', /\bferoxbuster\/([\w.]+)/i, 'scanner'], ['gobuster', /\bgobuster\/([\w.]+)/i, 'scanner'], ['DirBuster', /\bDirBuster-([\w.]+)/i, 'scanner'], ['dirb', /\bdirb\b/i, 'scanner'],
  ['WhatWeb', /\bWhatWeb\/([\w.]+)/i, 'scanner'], ['Metasploit', /\bMetasploit\b/i, 'scanner'], ['Havij', /\bHavij\b/i, 'scanner'], ['Commix', /\bcommix\/v?([\w.]*)/i, 'scanner'],
  ['CensysInspect', /\bCensysInspect\/([\w.]+)/i, 'scanner'], ['Shodan', /\bShodan\b/i, 'scanner'], ['Expanse', /\bExpanse\b/i, 'scanner'], ['InternetMeasurement', /\bInternetMeasurement\/([\w.]+)/i, 'scanner'],
  ['NetcraftSurveyAgent', /\bNetcraftSurveyAgent\/([\w.]+)/i, 'scanner'], ['Nmap', /\bnmap\b/i, 'scanner'], ['Detectify', /\bDetectify\b/i, 'scanner'], ['Jaeles', /\bJaeles\b/i, 'scanner'],
  ['Go-http-client (projectdiscovery httpx)', /\bhttpx - Open-source project/i, 'scanner'], ['l9explore', /\bl9explore\/([\w.]+)/i, 'scanner'], ['Xenu Link Sleuth', /\bXenu Link Sleuth\/?([\w.]*)/i, 'scanner'],

  // ---- Crawlers and bots ---------------------------------------------------------------------------
  ['Googlebot-Image', /\bGooglebot-Image\/([\w.]+)/, 'bot'], ['Googlebot-News', /\bGooglebot-News\b/, 'bot'], ['Googlebot-Video', /\bGooglebot-Video\/([\w.]+)/, 'bot'],
  ['AdsBot-Google', /\bAdsBot-Google(?:-Mobile)?\b/, 'bot'], ['Mediapartners-Google', /\bMediapartners-Google\b/, 'bot'], ['Google-InspectionTool', /\bGoogle-InspectionTool\/([\w.]+)/, 'bot'],
  ['GoogleOther', /\bGoogleOther\b/, 'bot'], ['Storebot-Google', /\bStorebot-Google\/([\w.]+)/, 'bot'], ['APIs-Google', /\bAPIs-Google\b/, 'bot'], ['FeedFetcher-Google', /\bFeedFetcher-Google\b/i, 'bot'],
  ['Google-Read-Aloud', /\bGoogle-Read-Aloud\b/, 'bot'], ['Google-Site-Verification', /\bGoogle-Site-Verification\/([\w.]+)/, 'bot'], ['Google Favicon', /\bGoogle Favicon\b/, 'bot'],
  ['Google-Extended', /\bGoogle-Extended\b/, 'bot'], ['Google-Safety', /\bGoogle-Safety\b/, 'bot'], ['Chrome-Lighthouse', /\bChrome-Lighthouse\b/, 'bot'], ['Google PageSpeed Insights', /\bPage ?Speed Insights\b/i, 'bot'],
  ['Googlebot', /\bGooglebot\/([\w.]+)/, 'bot'], ['Googlebot', /\bGooglebot\b/, 'bot'], ['GoogleHC', /\bGoogleHC\/([\w.]+)/, 'monitor'], ['Google Web Preview', /\bGoogle Web Preview\b/, 'bot'],
  ['bingbot', /\bbingbot\/([\w.]+)/i, 'bot'], ['BingPreview', /\bBingPreview\/([\w.]+)/, 'bot'], ['adidxbot', /\badidxbot\/([\w.]+)/, 'bot'], ['msnbot', /\bmsnbot(?:-media)?\/([\w.]+)/i, 'bot'],
  ['MicrosoftPreview', /\bMicrosoftPreview\/([\w.]+)/, 'bot'], ['Yahoo! Slurp', /\bYahoo! Slurp\b/, 'bot'], ['DuckDuckBot', /\bDuckDuckBot(?:-Https)?\/([\w.]+)/, 'bot'], ['DuckDuckGo-Favicons-Bot', /\bDuckDuckGo-Favicons-Bot\/([\w.]+)/, 'bot'],
  ['Baiduspider', /\bBaiduspider(?:-\w+)?\/?([\w.]*)/i, 'bot'], ['YandexBot', /\bYandex(?:Bot|Images|Video|Media|Blogs|News|Mobile\w*|Metrika|Favicons|Webmaster|Accessibility\w*|RenderResources\w*)\/([\w.]+)/, 'bot'],
  ['Sogou spider', /\bSogou (?:web|inst|\w+) ?spider\/?([\w.]*)/i, 'bot'], ['Exabot', /\bExabot\/([\w.]+)/, 'bot'], ['SeznamBot', /\bSeznamBot\/([\w.]+)/, 'bot'], ['Qwantify', /\bQwantify\/?([\w.]*)/, 'bot'],
  ['Mail.RU Bot', /\bMail\.RU_Bot\/([\w.]+)/, 'bot'], ['Applebot', /\bApplebot(?:-Extended)?\/([\w.]+)/, 'bot'], ['Amazonbot', /\bAmazonbot\/([\w.]+)/, 'bot'], ['PetalBot', /\bPetalBot\b/, 'bot'],
  ['Bytespider', /\bBytespider\b/, 'bot'], ['GPTBot', /\bGPTBot\/([\w.]+)/, 'bot'], ['ChatGPT-User', /\bChatGPT-User\/?([\w.]*)/, 'bot'], ['OAI-SearchBot', /\bOAI-SearchBot\/([\w.]+)/, 'bot'],
  ['ClaudeBot', /\bClaudeBot\/([\w.]+)/, 'bot'], ['Claude-Web', /\bClaude-Web\/?([\w.]*)/, 'bot'], ['anthropic-ai', /\banthropic-ai\b/, 'bot'], ['PerplexityBot', /\bPerplexityBot\/([\w.]+)/, 'bot'],
  ['cohere-ai', /\bcohere-ai\b/, 'bot'], ['Diffbot', /\bDiffbot\b/, 'bot'], ['CCBot', /\bCCBot\/([\w.]+)/, 'bot'], ['meta-externalagent', /\bmeta-externalagent\/([\w.]+)/, 'bot'],
  ['facebookexternalhit', /\bfacebookexternalhit\/([\w.]+)/, 'bot'], ['facebookcatalog', /\bfacebookcatalog\/([\w.]+)/, 'bot'], ['Twitterbot', /\bTwitterbot\/([\w.]+)/, 'bot'], ['LinkedInBot', /\bLinkedInBot\/([\w.]+)/, 'bot'],
  ['Slackbot', /\bSlackbot(?:-LinkExpanding)? ?([\w.]*)/, 'bot'], ['Slack-ImgProxy', /\bSlack-ImgProxy\b/, 'bot'], ['Discordbot', /\bDiscordbot\/([\w.]+)/, 'bot'], ['TelegramBot', /\bTelegramBot\b/, 'bot'],
  ['WhatsApp link preview', /^WhatsApp\/([\w.]+) [AWNi]$/, 'bot'], ['Pinterestbot', /\bPinterest(?:bot)?\/([\w.]+)/, 'bot'], ['redditbot', /\bredditbot\/([\w.]+)/, 'bot'], ['Embedly', /\bEmbedly\/([\w.]+)/, 'bot'],
  ['Skype URL Preview', /\bSkypeUriPreview\b/, 'bot'], ['AhrefsBot', /\bAhrefs(?:Bot|SiteAudit)\/([\w.]+)/, 'bot'], ['SemrushBot', /\bSemrushBot(?:-\w+)?\/?([\w.~]*)/, 'bot'], ['MJ12bot', /\bMJ12bot\/v?([\w.]+)/, 'bot'],
  ['DotBot', /\bDotBot\/([\w.]+)/, 'bot'], ['rogerbot', /\brogerbot\/([\w.]+)/, 'bot'], ['BLEXBot', /\bBLEXBot\/([\w.]+)/, 'bot'], ['DataForSeoBot', /\bDataForSeoBot\/([\w.]+)/, 'bot'],
  ['serpstatbot', /\bserpstatbot\/([\w.]+)/, 'bot'], ['ZoominfoBot', /\bZoominfoBot\b/, 'bot'], ['Screaming Frog SEO Spider', /\bScreaming Frog SEO Spider\/([\w.]+)/, 'bot'], ['SiteAuditBot', /\bSiteAuditBot\/([\w.]+)/, 'bot'],
  ['archive.org_bot', /\barchive\.org_bot\b/, 'bot'], ['ia_archiver', /\bia_archiver\b/, 'bot'], ['Wayback Machine', /\bWayback Machine\b/i, 'bot'], ['W3C Validator', /\bW3C[_-](?:Validator|CSS_Validator\w*|checklink)\/?([\w.]*)/i, 'bot'],
  ['Cloudflare Always Online', /\bCloudFlare-AlwaysOnline\/([\w.]+)/i, 'bot'], ['Cloudflare Health Checks', /\bCloudflare-(?:Traffic-Manager|Healthchecks)\/([\w.]+)/i, 'monitor'], ['Amazon CloudFront', /\bAmazon CloudFront\b/, 'monitor'],
  ['ELB-HealthChecker', /\bELB-HealthChecker\/([\w.]+)/, 'monitor'], ['kube-probe', /\bkube-probe\/([\w.]+)/, 'monitor'], ['UptimeRobot', /\bUptimeRobot\/([\w.]+)/, 'monitor'], ['Pingdom', /\bPingdom\.com_bot_version_([\w.]+)/i, 'monitor'],
  ['StatusCake', /\bStatusCake\b/, 'monitor'], ['Site24x7', /\bSite24x7\b/, 'monitor'], ['Datadog Synthetics', /\bDatadog(?:Synthetics)?\b/, 'monitor'], ['New Relic Pinger', /\bNewRelicPinger\/([\w.]+)/, 'monitor'],
  ['GTmetrix', /\bGTmetrix\b/, 'monitor'], ['Zabbix', /\bZabbix\b/, 'monitor'], ['Nagios', /\bcheck_http\/v?([\w.]+)/, 'monitor'], ['Prometheus', /\bPrometheus\/([\w.]+)/, 'monitor'], ['Blackbox Exporter', /\bBlackbox Exporter\/([\w.]+)/, 'monitor'],
  ['Feedly', /\bFeedly\/([\w.]+)/, 'bot'], ['Tiny Tiny RSS', /\bTiny Tiny RSS\/([\w.]+)/, 'bot'], ['HeadlessChrome', /\bHeadlessChrome\/([\w.]+)/, 'automation'], ['PhantomJS', /\bPhantomJS\/([\w.]+)/, 'automation'],
  ['Puppeteer', /\bPuppeteer\b/i, 'automation'], ['Playwright', /\bPlaywright\/?([\w.]*)/i, 'automation'], ['Selenium', /\bSelenium\b/i, 'automation'], ['Cypress', /\bCypress\/([\w.]+)/, 'automation'],

  // ---- HTTP libraries and command-line tools ------------------------------------------------------
  ['curl', /^curl\/([\w.]+)/i, 'tool'], ['Wget', /^Wget\/([\w.]+)/i, 'tool'], ['HTTPie', /\bHTTPie\/([\w.]+)/, 'tool'], ['aria2', /\baria2\/([\w.]+)/, 'tool'], ['libcurl', /\blibcurl\/([\w.]+)/, 'tool'],
  ['PowerShell', /\b(?:Windows)?PowerShell\/([\w.]+)/, 'tool'], ['Microsoft BITS', /\bMicrosoft BITS\/([\w.]+)/, 'tool'], ['Microsoft-CryptoAPI', /\bMicrosoft-CryptoAPI\/([\w.]+)/, 'tool'],
  ['Microsoft WinHTTP', /\bWinHttp(?:\.WinHttpRequest|-Autoproxy-Service)\b[./]*([\d.]*)/i, 'tool'], ['Windows Update Agent', /\bWindows-Update-Agent\/([\w.]+)/, 'tool'], ['certutil', /\bCertUtil URL Agent\b/, 'tool'],
  ['python-requests', /\bpython-requests\/([\w.]+)/, 'tool'], ['Python-urllib', /\bPython-urllib\/([\w.]+)/, 'tool'], ['aiohttp', /\baiohttp\/([\w.]+)/, 'tool'], ['python-httpx', /\bpython-httpx\/([\w.]+)/, 'tool'],
  ['Scrapy', /\bScrapy\/([\w.]+)/, 'tool'], ['Python', /^Python\/([\w.]+)/, 'tool'], ['Go-http-client', /\bGo-http-client\/([\w.]+)/, 'tool'], ['fasthttp', /\bfasthttp\b/, 'tool'], ['Go resty', /\bgo-resty\/([\w.]+)/, 'tool'],
  ['okhttp', /\bokhttp\/([\w.]+)/, 'tool'], ['Apache-HttpClient', /\bApache-HttpClient\/([\w.]+)/, 'tool'], ['Apache HttpAsyncClient', /\bApache-HttpAsyncClient\/([\w.]+)/, 'tool'], ['Java', /^Java\/([\w.]+)/, 'tool'],
  ['Jakarta Commons-HttpClient', /\bJakarta Commons-HttpClient\/([\w.]+)/, 'tool'], ['axios', /\baxios\/([\w.]+)/, 'tool'], ['node-fetch', /\bnode-fetch\/?([\w.]*)/, 'tool'], ['undici', /\bundici\b/, 'tool'], ['got', /^got(?:\/([\w.]+))? ?\(/, 'tool'],
  ['Node.js', /^node(?:\.js)?\b\/?v?([\w.]*)/i, 'tool'], ['Deno', /\bDeno\/([\w.]+)/, 'tool'], ['Bun', /\bBun\/([\w.]+)/, 'tool'], ['superagent', /\bsuperagent\/([\w.]+)/, 'tool'],
  ['PostmanRuntime', /\bPostmanRuntime\/([\w.]+)/, 'tool'], ['Insomnia', /\binsomnia\/([\w.]+)/i, 'tool'], ['libwww-perl', /\blibwww-perl\/([\w.]+)/, 'tool'], ['LWP::Simple', /\bLWP::Simple\/([\w.]+)/, 'tool'],
  ['WWW-Mechanize', /\bWWW-Mechanize\/([\w.]+)/, 'tool'], ['Ruby', /^Ruby\b\/?([\w.]*)/, 'tool'], ['Faraday', /\bFaraday v([\w.]+)/, 'tool'], ['rest-client', /\brest-client\/([\w.]+)/, 'tool'],
  ['GuzzleHttp', /\bGuzzleHttp\/([\w.]+)/, 'tool'], ['Symfony HttpClient', /\bSymfony HttpClient\b/, 'tool'], ['PHP', /^PHP\/([\w.]+)/, 'tool'], ['Zend_Http_Client', /\bZend_Http_Client\b/, 'tool'],
  ['reqwest', /\breqwest\/([\w.]+)/, 'tool'], ['hyper', /^hyper\/([\w.]+)/, 'tool'], ['Dart', /\bDart\/([\w.]+)/, 'tool'], ['RestSharp', /\bRestSharp\/([\w.]+)/, 'tool'],
  ['ApacheBench', /\bApacheBench\/([\w.]+)/, 'tool'], ['Apache JMeter', /\bApache-JMeter\b|\bJMeter\b/, 'tool'], ['k6', /\bk6\/([\w.]+)/, 'tool'], ['wrk', /^wrk\b/, 'tool'], ['Siege', /\bSiege\/([\w.]+)/i, 'tool'],
  ['git', /^git\/([\w.]+)/, 'tool'], ['Docker', /^docker\/([\w.]+)/i, 'tool'], ['Kubernetes client', /^kubectl\/v?([\w.]+)/, 'tool'], ['pip', /^pip\/([\w.]+)/, 'tool'], ['npm', /^npm\/([\w.]+)/, 'tool'],
  ['Debian APT', /^Debian APT-HTTP\/([\w.]+)/, 'tool'], ['Homebrew', /^Homebrew\/([\w.]+)/, 'tool'], ['AWS CLI', /^aws-cli\/([\w.]+)/, 'tool'], ['Boto3', /\bBoto3\/([\w.]+)/, 'tool'], ['Terraform', /\bTerraform\/([\w.]+)/, 'tool'],
  ['Dalvik', /^Dalvik\/([\w.]+)/, 'tool'],

  // ---- Applications with an embedded browser -------------------------------------------------------
  ['Facebook app', /\b(?:FBAN|FB_IAB|FBAV)\b.*?FBAV\/([\w.]+)|\bFBAN\/|\bFB_IAB\//, 'app'], ['Instagram app', /\bInstagram ([\w.]+)/, 'app'], ['TikTok app', /\b(?:musical_ly|BytedanceWebview|trill|TikTok)[_ /]?([\d.]*)/, 'app'],
  ['Snapchat app', /\bSnapchat\/([\w.]+)/, 'app'], ['Twitter app', /\bTwitter(?:Android| for iPhone| for iPad)\b\/?([\w.]*)/, 'app'], ['LinkedIn app', /\bLinkedInApp\b\/?([\w.]*)/, 'app'], ['Pinterest app', /\bPinterest for \w+\/([\w.]+)/, 'app'],
  ['LINE app', /\bLine\/([\w.]+)/, 'app'], ['KakaoTalk app', /\bKAKAOTALK[ /]([\w.]+)/, 'app'], ['WeChat', /\bMicroMessenger\/([\w.]+)/, 'app'], ['QQ', /\bQQ\/([\w.]+)/, 'app'], ['Alipay', /\bAlipayClient\/([\w.]+)/, 'app'],
  ['DingTalk', /\bDingTalk\/([\w.]+)/, 'app'], ['Weibo app', /\bWeibo \(|\b__weibo__([\w.]+)/, 'app'], ['Telegram app', /\bTelegram(?:-Android|Desktop)?\/([\w.]+)/, 'app'], ['Viber', /\bViber\/([\w.]+)/, 'app'],
  ['Microsoft Teams', /\bTeams(?:MobileHybrid)?\/([\w.]+)/, 'app'], ['Slack', /\bSlack(?:_SSB)?\/([\w.]+)/, 'app'], ['Discord', /\bdiscord\/([\w.]+)/i, 'app'], ['Zoom', /\bZoom(?:Webkit|Chat)?[ /]([\w.]+)/, 'app'],
  ['Microsoft Outlook', /\bMicrosoft Outlook ([\w.]+)|\bOutlook-(?:iOS|Android)\/([\w.]+)|\bms-office;.*Outlook ([\w.]+)/, 'email'], ['Microsoft Office', /\bMicrosoft Office(?: \w+)?[ /]([\w.]+)|\bms-office\b/, 'app'],
  ['Thunderbird', /\bThunderbird\/([\w.]+)/, 'email'], ['Apple Mail', /\bMail\/([\w.]+) CFNetwork/, 'email'], ['Spotify', /\bSpotify\/([\w.]+)/, 'app'], ['Steam', /\bValve Steam \w+\/?([\w.]*)/, 'app'],
  ['Google app', /\bGSA\/([\w.]+)/, 'app'], ['Google Earth', /\bGoogleEarth\/([\w.]+)/, 'app'], ['iTunes', /\biTunes\/([\w.]+)/, 'app'], ['Podcasts', /\bPodcasts\/([\w.]+)/, 'app'], ['VLC', /\bVLC\/([\w.]+)/, 'app'],
  ['Kodi', /\bKodi\/([\w.]+)/, 'app'], ['Roku', /^Roku\/DVP-([\w.]+)/, 'app'], ['Electron app', /\bElectron\/([\w.]+)/, 'app'],

  // ---- Browsers ------------------------------------------------------------------------------------
  ['Edge', /\bEdg\/([\w.]+)/, 'browser'], ['Edge Mobile', /\bEdgA\/([\w.]+)/, 'browser'], ['Edge Mobile', /\bEdgiOS\/([\w.]+)/, 'browser'], ['Edge (EdgeHTML)', /\bEdge\/([\w.]+)/, 'browser'],
  ['Opera Mini', /\bOpera Mini\/([\w.]+)/, 'browser'], ['Opera Touch', /\bOPT\/([\w.]+)/, 'browser'], ['Opera Mobile', /\bOPR\/([\w.]+).*\bMobile\b|\bMobile\b.*\bOPR\/([\w.]+)|\bOpera Mobi\b.*Version\/([\w.]+)|\bOPiOS\/([\w.]+)/, 'browser'],
  ['Opera GX', /\bOPX\/([\w.]+)/, 'browser'], ['Opera', /\bOPR\/([\w.]+)/, 'browser'], ['Opera', /^Opera\/.*\bVersion\/([\w.]+)|\bOpera[ /]([\w.]+)/, 'browser'],
  ['Vivaldi', /\bVivaldi\/([\w.]+)/, 'browser'], ['Yandex Browser', /\bYaBrowser\/([\w.]+)/, 'browser'], ['Samsung Internet', /\bSamsungBrowser\/([\w.]+)/, 'browser'], ['UC Browser', /\bU[C]?Browser\/([\w.]+)|\bUCWEB\/?([\w.]*)/, 'browser'],
  ['QQ Browser', /\bM?QQBrowser\/([\w.]+)/, 'browser'], ['Baidu Browser', /\b(?:baidubrowser|BIDUBrowser|baiduboxapp)[ /]([\w.]+)/i, 'browser'], ['Huawei Browser', /\bHuaweiBrowser\/([\w.]+)/, 'browser'],
  ['MIUI Browser', /\bMiuiBrowser\/([\w.]+)/, 'browser'], ['HeyTap Browser', /\bHeyTapBrowser\/([\w.]+)/, 'browser'], ['Vivo Browser', /\bVivoBrowser\/([\w.]+)/, 'browser'], ['Amazon Silk', /\bSilk\/([\w.]+)/, 'browser'],
  ['Naver Whale', /\bWhale\/([\w.]+)/, 'browser'], ['DuckDuckGo', /\bDuckDuckGo\/([\w.]+)|\bDdg\/([\w.]+)/, 'browser'], ['Brave', /\bBrave(?: Chrome)?\/([\w.]+)/, 'browser'], ['Firefox Focus', /\b(?:Focus|Klar)\/([\w.]+)/, 'browser'],
  ['Firefox for iOS', /\bFxiOS\/([\w.]+)/, 'browser'], ['Chrome for iOS', /\bCriOS\/([\w.]+)/, 'browser'], ['Puffin', /\bPuffin\/([\w.]+)/, 'browser'], ['Maxthon', /\b(?:Maxthon|MxBrowser)[ /]([\w.]+)/, 'browser'],
  ['Coc Coc', /\bcoc_coc_browser\/([\w.]+)/, 'browser'], ['Avast Secure Browser', /\bAvast\/([\w.]+)/, 'browser'], ['AVG Secure Browser', /\bAVG\/([\w.]+)/, 'browser'], ['Sleipnir', /\bSleipnir\/([\w.]+)/, 'browser'],
  ['SRWare Iron', /\bIron\/([\w.]+)/, 'browser'], ['Comodo Dragon', /\bDragon\/([\w.]+)/, 'browser'], ['Tesla Browser', /\bQtCarBrowser\b|\bTesla\/([\w.-]+)/, 'browser'], ['Oculus Browser', /\bOculusBrowser\/([\w.]+)/, 'browser'],
  ['Kindle Browser', /\bKindle\/([\w.]+)/, 'browser'], ['PlayStation Browser', /\bPlayStation (?:4|5|Vita|Portable)\b[ /]*([\d.]*)/, 'browser'], ['Nintendo Browser', /\bNintendoBrowser\/([\w.]+)/, 'browser'],
  ['SeaMonkey', /\bSeaMonkey\/([\w.]+)/, 'browser'], ['Pale Moon', /\bPaleMoon\/([\w.]+)/, 'browser'], ['Waterfox', /\bWaterfox\/([\w.]+)/, 'browser'], ['Basilisk', /\bBasilisk\/([\w.]+)/, 'browser'],
  ['Iceweasel', /\bIceweasel\/([\w.]+)/, 'browser'], ['Tor Browser', /\bTorBrowser\/([\w.]+)/, 'browser'], ['GNOME Web', /\bEpiphany\/([\w.]+)/, 'browser'], ['Konqueror', /\bKonqueror\/([\w.]+)/, 'browser'],
  ['Falkon', /\bFalkon\/([\w.]+)/, 'browser'], ['qutebrowser', /\bqutebrowser\/([\w.]+)/, 'browser'], ['Midori', /\bMidori\/([\w.]+)/, 'browser'], ['Otter', /\bOtter\/([\w.]+)/, 'browser'], ['NetSurf', /\bNetSurf\/([\w.]+)/, 'browser'],
  ['Chrome WebView', /\bVersion\/[\d.]+ Chrome\/([\w.]+)|; wv\).*\bChrome\/([\w.]+)/, 'browser'], ['Chromium', /\bChromium\/([\w.]+)/, 'browser'],
  ['Chrome Mobile', /\bChrome\/([\w.]+) Mobile\b/, 'browser'], ['Chrome', /\bChrome\/([\w.]+)/, 'browser'],
  ['Firefox Mobile', /\b(?:Mobile|Tablet);.*\bFirefox\/([\w.]+)|\bAndroid\b.*\bFirefox\/([\w.]+)/, 'browser'], ['Firefox', /\bFirefox\/([\w.]+)/, 'browser'],
  ['IE Mobile', /\bIEMobile[ /]([\w.]+)/, 'browser'], ['Internet Explorer', /\bMSIE ([\w.]+)/, 'browser'], ['Internet Explorer', /\bTrident\/.*\brv:([\w.]+)/, 'browser'],
  ['BlackBerry Browser', /\b(?:BB10|BlackBerry|PlayBook)\b.*\bVersion\/([\w.]+)|^BlackBerry\w*\/([\w.]+)/, 'browser'], ['NetFront', /\bNetFront\/([\w.]+)/, 'browser'], ['Nokia Browser', /\b(?:NokiaBrowser|BrowserNG|Series60)\/([\w.]+)/, 'browser'],
  ['Android Browser', /\bAndroid\b.*\bVersion\/([\w.]+).*\bSafari\//, 'browser'], ['Safari Mobile', /\bVersion\/([\w.]+).*\bMobile\/\w+.*\bSafari\//, 'browser'], ['Safari', /\bVersion\/([\w.]+).*\bSafari\//, 'browser'],
  ['Safari (WebKit view)', /\b(?:iPhone|iPad|iPod)\b.*\bAppleWebKit\/([\w.]+)/, 'browser'], ['Lynx', /^Lynx\/([\w.]+)/, 'browser'], ['w3m', /^w3m\/([\w.]+)/, 'browser'], ['Links', /^E?Links \(?([\w.]+)/, 'browser'],
  ['Netscape', /\b(?:Netscape\d?|Navigator)\/([\w.]+)/, 'browser'], ['NCSA Mosaic', /\bNCSA[ _]Mosaic\/([\w.]+)/, 'browser'], ['Apple CFNetwork client', /\bCFNetwork\/([\w.]+)/, 'tool'],
];

const WINDOWS = { '10.0': '10', '6.3': '8.1', '6.2': '8', '6.1': '7', '6.0': 'Vista', '5.2': 'XP', '5.1': 'XP', '5.01': '2000', '5.0': '2000', '4.0': 'NT 4.0' };
const dotted = v => v ? v.replace(/_/g, '.') : undefined;

// [name, pattern, version from match]
const SYSTEMS = [
  ['Windows Phone', /\bWindows Phone(?: OS)? ([\d.]+)/, m => m[1]], ['Xbox', /\bXbox(?: One| Series [XS])?\b/, () => undefined], ['Windows', /\bWindows NT ([\d.]+)/, m => WINDOWS[m[1]] || m[1]],
  ['Windows', /\bWindows (98|95|ME|CE|2000|XP|Vista|7|8\.1|8|10|11)\b/, m => m[1]], ['Windows', /\bWin(?:dows|32|64)\b/, () => undefined],
  ['tvOS', /\bApple ?TV\b(?:.*\bOS ([\d_.]+))?/, m => dotted(m[1])], ['watchOS', /\bWatch(?:OS|[\d,]+)\b[ /]*([\d_.]*)/, m => dotted(m[1]) || undefined],
  ['iPadOS', /\biPad\b.*?\bOS ([\d_]+)/, m => dotted(m[1])], ['iOS', /\b(?:iPhone|iPod)\b.*?\bOS ([\d_]+)|\bCPU (?:iPhone )?OS ([\d_]+)/, m => dotted(m[1] || m[2])], ['iOS', /\biOS[ /]([\d_.]+)/, m => dotted(m[1])],
  ['iOS', /\b(?:iPhone|iPad|iPod)\b/, () => undefined], ['HarmonyOS', /\bHarmonyOS[ /]?([\d.]*)/, m => m[1] || undefined], ['Fire OS', /\bKF[A-Z]{2,}\b|\bAFT[A-Z]+\b/, () => undefined],
  ['Android', /\bAndroid[ /-]?([\d.]+)?/, m => m[1]], ['Chrome OS', /\bCrOS \S+ ([\d.]+)/, m => m[1]], ['Chromecast', /\bCrKey\/([\d.]+)/, m => m[1]], ['KaiOS', /\bKAIOS\/([\d.]+)/i, m => m[1]],
  ['Tizen', /\bTizen[ /]?([\d.]*)/, m => m[1] || undefined], ['webOS', /\b(?:Web0S|webOS)\b[ /]*(?:TV-)?([\d.]*)/, m => m[1] || undefined], ['Roku OS', /\bRoku\b(?:OS)?\/?(?:DVP-)?([\d.]*)/, m => m[1] || undefined],
  ['PlayStation', /\bPlayStation (\d|Vita|Portable)\b/, m => m[1]], ['Nintendo', /\bNintendo (Switch|WiiU|Wii|3DS)\b/, m => m[1]], ['BlackBerry OS', /\b(?:BB10|BlackBerry|PlayBook)\b/, () => undefined],
  ['Symbian', /\b(?:SymbianOS|Symbian|Series ?60)\/?([\d.]*)/, m => m[1] || undefined], ['Sailfish OS', /\bSailfish\b/, () => undefined], ['Fuchsia', /\bFuchsia\b/, () => undefined],
  ['macOS', /\bMac OS X ([\d_.]+)/, m => dotted(m[1])], ['macOS', /\bMacintosh\b|\bMac OS X\b|\bmacOS\b/, () => undefined], ['Darwin (iOS / macOS)', /\bDarwin\/([\d.]+)/, m => m[1]],
  ['Ubuntu', /\bUbuntu(?:\/([\w.]+))?/, m => m[1]], ['Debian', /\bDebian\b/, () => undefined], ['Fedora', /\bFedora(?:\/([\w.-]+))?/, m => m[1]], ['Red Hat', /\bRed Hat\b|\bRHEL\b/, () => undefined],
  ['CentOS', /\bCentOS\b/, () => undefined], ['SUSE', /\b(?:open)?SUSE\b/i, () => undefined], ['Linux Mint', /\bLinux Mint\b/, () => undefined], ['Arch Linux', /\bArch ?Linux\b/, () => undefined],
  ['Gentoo', /\bGentoo\b/, () => undefined], ['FreeBSD', /\bFreeBSD\b/, () => undefined], ['OpenBSD', /\bOpenBSD\b/, () => undefined], ['NetBSD', /\bNetBSD\b/, () => undefined], ['Solaris', /\bSunOS\b|\bSolaris\b/, () => undefined],
  ['Linux', /\bLinux\b|\bX11\b/, () => undefined],
];

// Android device model prefixes that identify the manufacturer.
const VENDORS = [
  ['Samsung', /^(?:SM-|GT-|SCH-|SGH-|SPH-|SHV-|SAMSUNG)/i], ['Google', /^(?:Pixel|Nexus)/], ['Huawei', /^(?:HUAWEI|[A-Z]{3}-(?:AL|TL|LX?|AN|NX|W)\d{1,2}[A-Z]?$|Mate|P\d{2} )/], ['Honor', /^(?:HONOR|Honor)/],
  ['Xiaomi', /^(?:Mi |MI |MIX|Redmi|POCO|M\d{4}[A-Z]\d+[A-Z]*|2\d{7,}[A-Z]*|Xiaomi)/], ['OnePlus', /^(?:ONEPLUS|OnePlus|LE\d{4}|KB\d{4}|IN\d{4}|NE\d{4}|GM\d{4}|HD\d{4}|CPH2[45]\d\d$|PJ[A-Z]\d{3})/],
  ['OPPO', /^(?:OPPO|CPH\d{4}|PC[A-Z]{2}\d\d|PD[A-Z]{2}\d\d|PE[A-Z]{2}\d\d)/], ['Realme', /^(?:realme|RMX\d{4})/i], ['Vivo', /^(?:vivo|V\d{4}[A-Z]*$)/i], ['Motorola', /^(?:moto|Moto|XT\d{4}|Motorola)/],
  ['LG', /^(?:LG-|LM-|LGE|LG )/], ['Sony', /^(?:SO-|SOV|Xperia|XQ-|[A-Z]\d{4}$|E\d{4}$)/], ['Nokia', /^(?:Nokia|TA-\d{4})/], ['HTC', /^HTC/], ['Lenovo', /^(?:Lenovo|TB-|TB\d)/], ['Asus', /^(?:ASUS|ZenFone|Z[SEB]\d|AI2\d{3})/],
  ['TCL', /^(?:TCL|T\d{3}[A-Z])/], ['Alcatel', /^(?:Alcatel|ALCATEL|\d{4}[A-Z]$)/], ['ZTE', /^(?:ZTE|Blade|nubia|NX\d{3})/i], ['Tecno', /^TECNO/i], ['Infinix', /^Infinix/i], ['itel', /^itel/i],
  ['Amazon', /^(?:KF[A-Z]{2,}|Kindle|AFT[A-Z]+)/], ['Microsoft', /^(?:Lumia|Surface)/], ['BlackBerry', /^(?:BB[A-Z]\d|BlackBerry)/], ['Nothing', /^(?:A0\d\d$|Nothing)/], ['Fairphone', /^FP\d/],
  ['Meizu', /^(?:Meizu|M\d{3}[A-Z]$)/i], ['Sharp', /^(?:SH-|SHARP|AQUOS)/], ['Kyocera', /^(?:KYOCERA|KY[A-Z]\d)/i], ['Wiko', /^(?:Wiko|W-)/i], ['Doogee', /^DOOGEE/i], ['Ulefone', /^(?:Ulefone|Armor)/i],
];

function device(t, os) {
  let m;
  if (/\biPhone/.test(t)) return { model: 'iPhone', type: 'mobile', vendor: 'Apple' };
  if (/\biPad/.test(t)) return { model: 'iPad', type: 'tablet', vendor: 'Apple' };
  if (/\bKindle\b/.test(t)) return { model: 'Kindle', type: 'ereader', vendor: 'Amazon' };
  if (/\biPod\b/.test(t)) return { model: 'iPod touch', type: 'mobile', vendor: 'Apple' };
  if (/\bApple ?TV\b/.test(t)) return { model: 'Apple TV', type: 'tv', vendor: 'Apple' };
  if (/\bWatch\d|\bApple Watch\b|\bWatchOS\b/i.test(t)) return { model: 'Apple Watch', type: 'wearable', vendor: 'Apple' };
  if ((m = /\bPlayStation (\d|Vita|Portable)\b/.exec(t))) return { model: `PlayStation ${m[1]}`, type: 'console', vendor: 'Sony' };
  if ((m = /\bXbox(?: One| Series [XS])?\b/.exec(t))) return { model: m[0], type: 'console', vendor: 'Microsoft' };
  if ((m = /\bNintendo (Switch|WiiU|Wii|3DS)\b/.exec(t))) return { model: `Nintendo ${m[1]}`, type: 'console', vendor: 'Nintendo' };
  if (/\bQtCarBrowser\b|\bTesla\//.test(t)) return { model: 'Tesla', type: 'car', vendor: 'Tesla' };
  if ((m = /\bCrKey\b|\bRoku\b|\bSMART-TV\b|\bSmartTV\b|\bSmart TV\b|\bHbbTV\b|\bWeb0S\b|\bBRAVIA\b|\bGoogleTV\b|\bAndroid TV\b|\bNetCast\b|\bViera\b|\bAFT[A-Z]+\b|\bTizen\b.*\bTV\b/.exec(t))) {
    const vendor = /Web0S|NetCast|LG/.test(t) ? 'LG' : /Tizen|SMART-TV|Samsung/i.test(t) ? 'Samsung' : /BRAVIA/.test(t) ? 'Sony' : /CrKey|GoogleTV/.test(t) ? 'Google' : /Roku/.test(t) ? 'Roku' : /AFT/.test(t) ? 'Amazon' : /Viera/.test(t) ? 'Panasonic' : undefined;
    return { model: m[0], type: 'tv', vendor };
  }
  if ((m = /\bAndroid[^;)]*;(?: [a-z]{2}[-_][A-Za-z]{2};)? ?([^;)]+?)(?: Build\/[^;)]*)?(?:; wv)?\)/.exec(t))) {
    let model = m[1].trim();
    // Reduced user agents report the placeholder "K" instead of a model.
    if (model === 'K' || /^(?:Mobile|Tablet|Linux|U|rv:[\d.]+)$/i.test(model)) model = undefined;
    const vendor = model ? (VENDORS.find(([, rx]) => rx.test(model)) || [])[0] : undefined;
    const tablet = /\bTablet\b|\bTab\b|\bSM-[TX]\d|\bKF[A-Z]{2,}\b|\bPad\b/i.test(t) || !/\bMobile\b/.test(t);
    return { model, type: tablet ? 'tablet' : 'mobile', vendor };
  }
  if (/\bWindows Phone\b|\bIEMobile\b/.test(t)) return { model: (/\b(Lumia \d+)/.exec(t) || [])[1], type: 'mobile', vendor: /Lumia|Microsoft/.test(t) ? 'Microsoft' : undefined };
  if (/\b(?:BB10|BlackBerry|PlayBook)\b/.test(t)) return { model: 'BlackBerry', type: /PlayBook/.test(t) ? 'tablet' : 'mobile', vendor: 'BlackBerry' };
  if (/\bMacintosh\b/.test(t)) return { model: 'Macintosh', type: 'desktop', vendor: 'Apple' };
  if (/\bCrOS\b/.test(t)) return { model: 'Chromebook', type: 'desktop' };
  if (/\bMobile\b|\bOpera Mini\b|\bSymbian\b|\bKAIOS\b/i.test(t)) return { type: 'mobile' };
  if (os === 'Windows' || os === 'macOS' || /Linux|Ubuntu|Debian|Fedora|BSD|Solaris|SUSE|Red Hat|CentOS|Gentoo|Arch/.test(os || '')) return { type: 'desktop' };
  return {};
}

function engine(t) {
  let m;
  if ((m = /\bEdge\/([\w.]+)/.exec(t))) return { name: 'EdgeHTML', version: m[1] };
  if ((m = /\bTrident\/([\w.]+)/.exec(t))) return { name: 'Trident', version: m[1] };
  if ((m = /\bPresto\/([\w.]+)/.exec(t))) return { name: 'Presto', version: m[1] };
  if ((m = /\bGoanna\/([\w.]+)/.exec(t))) return { name: 'Goanna', version: m[1] };
  // Every browser on iOS is WebKit, whatever its name; elsewhere Chrome 28 and later is Blink.
  if ((m = /\bChrome\/([\w.]+)/.exec(t)) && parseInt(m[1], 10) >= 28 && !/\b(?:iPhone|iPad|iPod)\b/.test(t)) return { name: 'Blink', version: m[1] };
  if ((m = /\bAppleWebKit\/([\w.]+)/.exec(t))) return { name: 'WebKit', version: m[1] };
  if ((m = /\brv:([\w.]+).*\bGecko\//.exec(t))) return { name: 'Gecko', version: m[1] };
  if ((m = /\bKHTML\/([\w.]+)/.exec(t))) return { name: 'KHTML', version: m[1] };
  if ((m = /\bNetFront\/([\w.]+)/.exec(t))) return { name: 'NetFront', version: m[1] };
  if (/\bMSIE\b/.test(t)) return { name: 'Trident' };
  return {};
}

function cpu(t) {
  if (/\b(?:x86_64|x64|Win64|WOW64|amd64)\b/i.test(t)) return { architecture: 'amd64' };
  if (/\b(?:arm64|aarch64|armv8l?)\b/i.test(t)) return { architecture: 'arm64' };
  if (/\b(?:armv[67]l?|arm)\b/i.test(t)) return { architecture: 'arm' };
  if (/\b(?:i[3-6]86|x86)\b/i.test(t)) return { architecture: 'ia32' };
  if (/\b(?:ppc64|PowerPC|PPC)\b/.test(t)) return { architecture: 'ppc' };
  if (/\bsparc\w*\b/i.test(t)) return { architecture: 'sparc' };
  if (/\bmips\w*\b/i.test(t)) return { architecture: 'mips' };
  if (/\briscv64\b/i.test(t)) return { architecture: 'riscv64' };
  return {};
}

const KIND_LABEL = { browser: 'browser', app: 'app', email: 'email client', bot: 'bot', scanner: 'security scanner', tool: 'library / tool', monitor: 'monitoring', automation: 'automation' };

export function parseUserAgent(ua) {
  const t = ua.trim();
  const r = { ua: t, kind: 'unknown', browser: {}, device: {}, engine: {}, os: {}, cpu: {} };
  if (!t) return r;
  for (const [name, rx, kind] of CLIENTS) {
    const m = rx.exec(t);
    if (!m) continue;
    r.browser = { name, version: m.slice(1).find(x => x) || undefined };
    r.kind = KIND_LABEL[kind];
    // An Electron application names itself in the product token just before "Electron/".
    if (name === 'Electron app') { const app = /\b([A-Za-z][\w.-]*)\/([\w.]+) (?:Chrome\/[\w.]+ )?Electron\//.exec(t); if (app && !/^(?:Chrome|AppleWebKit|Mozilla|Safari)$/.test(app[1])) r.browser = { name: app[1], version: app[2] }; }
    // Apple's networking stack is used by any app; the app itself is the leading product token.
    if (name === 'Apple CFNetwork client') { const app = /^(.+?)\/([\w.]+) (?:\(.*?\) )?CFNetwork\//.exec(t); if (app) { r.browser = { name: app[1], version: app[2] }; r.kind = 'app'; } }
    break;
  }
  if (r.kind === 'unknown') {
    // Anything that calls itself a bot, crawler or spider, then the generic "Product/Version" convention.
    let m = /\b([\w.-]*(?:bot|crawler|spider|crawl|scraper|fetcher|checker|monitor|validator)[\w.-]*)(?:[ /]v?([\d][\w.]*))?/i.exec(t);
    if (m && !/^Mozilla\b/.test(m[1])) { r.browser = { name: m[1], version: m[2] }; r.kind = 'bot'; }
    else if ((m = /^([A-Za-z][\w .!+-]{0,60}?)[ /]v?(\d[\w.-]*)/.exec(t)) && !/^Mozilla$/.test(m[1])) { r.browser = { name: m[1].trim(), version: m[2] }; r.kind = 'library / tool'; }
    else if ((m = /^([A-Za-z][\w.-]{1,60})\s*(?:\(|$)/.exec(t)) && !/^Mozilla$/.test(m[1])) { r.browser = { name: m[1] }; r.kind = 'library / tool'; }
  }
  for (const [name, rx, version] of SYSTEMS) {
    const m = rx.exec(t);
    if (m) { r.os = { name, version: version(m) || undefined }; break; }
  }
  r.device = device(t, r.os.name);
  if (r.kind === 'bot' || r.kind === 'security scanner' || r.kind === 'monitoring') r.device = { ...r.device, type: 'bot' };
  else if (r.kind === 'library / tool' && !r.device.type) r.device = { ...r.device, type: 'script' };
  r.engine = engine(t);
  r.cpu = cpu(t);
  return r;
}
