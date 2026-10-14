#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Tests Parse User Agent against a corpus of real-world user agents: desktop and mobile browsers, in-app browsers,
// email clients, smart TVs and consoles, crawlers, monitoring probes, HTTP libraries, command-line tools and
// security scanners. Each entry gives the expected client, kind, operating system and device type
// (null = not checked), optionally followed by device vendor and client major version.
import '../modules/index.js';
import { MODULES } from '../core/registry.js';
import { parseUserAgent } from '../modules/networking/_user_agent.js';

const W10 = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', KHTML = 'AppleWebKit/537.36 (KHTML, like Gecko)';
const CORPUS = [
  // ---- Desktop browsers
  [`${W10} ${KHTML} Chrome/126.0.0.0 Safari/537.36`, 'Chrome', 'browser', 'Windows', 'desktop', null, '126'],
  [`${W10} ${KHTML} Chrome/126.0.0.0 Safari/537.36 Edg/126.0.2592.87`, 'Edge', 'browser', 'Windows', 'desktop', null, '126'],
  [`${W10} ${KHTML} Chrome/125.0.0.0 Safari/537.36 OPR/111.0.0.0`, 'Opera', 'browser', 'Windows', 'desktop'],
  [`${W10} ${KHTML} Chrome/124.0.0.0 Safari/537.36 Vivaldi/6.7.3329.35`, 'Vivaldi', 'browser', 'Windows', 'desktop'],
  [`${W10} ${KHTML} Chrome/124.0.0.0 YaBrowser/24.6.0.0 Safari/537.36`, 'Yandex Browser', 'browser', 'Windows', 'desktop'],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0', 'Firefox', 'browser', 'Windows', 'desktop', null, '127'],
  ['Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0', 'Firefox', 'browser', 'Ubuntu', 'desktop'],
  ['Mozilla/5.0 (X11; Linux x86_64; rv:115.0) Gecko/20100101 Firefox/115.0', 'Firefox', 'browser', 'Linux', 'desktop'],
  ['Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/118.0', 'Firefox', 'browser', 'Fedora', 'desktop'],
  [`${MAC} AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15`, 'Safari', 'browser', 'macOS', 'desktop', 'Apple', '17'],
  [`${MAC} ${KHTML} Chrome/126.0.0.0 Safari/537.36`, 'Chrome', 'browser', 'macOS', 'desktop', 'Apple'],
  ['Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36', 'Chrome', 'browser', 'Chrome OS', 'desktop'],
  ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/118.0.5993.70 Chrome/118.0.5993.70 Safari/537.36', 'Chromium', 'browser', 'Ubuntu', 'desktop'],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/18.17763', 'Edge (EdgeHTML)', 'browser', 'Windows', 'desktop'],
  ['Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko', 'Internet Explorer', 'browser', 'Windows', 'desktop', null, '11'],
  ['Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729)', 'Internet Explorer', 'browser', 'Windows', 'desktop', null, '8'],
  ['Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1)', 'Internet Explorer', 'browser', 'Windows', 'desktop'],
  ['Opera/9.80 (Windows NT 6.1; WOW64) Presto/2.12.388 Version/12.18', 'Opera', 'browser', 'Windows', 'desktop', null, '12'],
  ['Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0 SeaMonkey/2.53.18', 'SeaMonkey', 'browser', 'Windows', 'desktop'],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:102.0) Goanna/6.6 Firefox/102.0 PaleMoon/33.1.0', 'Pale Moon', 'browser', 'Windows', 'desktop'],
  ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 Epiphany/605.1.15', 'GNOME Web', 'browser', 'Linux', 'desktop'],
  ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) QtWebEngine/5.15.2 Chrome/87.0.4280.144 Safari/537.36 Falkon/3.1.0', 'Falkon', 'browser', 'Linux', 'desktop'],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Whale/3.25.232.19 Safari/537.36', 'Naver Whale', 'browser', 'Windows', 'desktop'],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) coc_coc_browser/120.0.0 Chrome/114.0.0.0 Safari/537.36', 'Coc Coc', 'browser', 'Windows', 'desktop'],
  ['Mozilla/5.0 (X11; FreeBSD amd64; rv:120.0) Gecko/20100101 Firefox/120.0', 'Firefox', 'browser', 'FreeBSD', 'desktop'],
  ['Lynx/2.9.0dev.10 libwww-FM/2.14 SSL-MM/1.4.1 GNUTLS/3.7.1', 'Lynx', 'browser', null, null],
  ['Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.12) Gecko/20080201 Firefox/2.0.0.12', 'Firefox', 'browser', 'Windows', 'desktop', null, '2'],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 OPR/112.0.0.0 OPX/112.0.0.0', 'Opera GX', 'browser', 'macOS', 'desktop'],

  // ---- Phones and tablets
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', 'Safari Mobile', 'browser', 'iOS', 'mobile', 'Apple'],
  ['Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1', 'Safari Mobile', 'browser', 'iPadOS', 'tablet', 'Apple'],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1', 'Chrome for iOS', 'browser', 'iOS', 'mobile'],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15', 'Firefox for iOS', 'browser', 'iOS', 'mobile'],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/124.0.2478.50 Mobile/15E148 Safari/605.1.15', 'Edge Mobile', 'browser', 'iOS', 'mobile'],
  ['Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36', 'Chrome Mobile', 'browser', 'Android', 'mobile', 'Google'],
  ['Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36', 'Chrome Mobile', 'browser', 'Android', 'mobile'],
  ['Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36', 'Samsung Internet', 'browser', 'Android', 'mobile', 'Samsung'],
  ['Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', 'Chrome', 'browser', 'Android', 'tablet', 'Samsung'],
  ['Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0', 'Firefox Mobile', 'browser', 'Android', 'mobile'],
  ['Mozilla/5.0 (Linux; Android 12; M2101K6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.4.1-gn', 'MIUI Browser', 'browser', 'Android', 'mobile', 'Xiaomi'],
  ['Mozilla/5.0 (Linux; U; Android 11; en-US; RMX3085 Build/RP1A.200720.011) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0.4896.58 UCBrowser/13.4.0.1306 Mobile Safari/537.36', 'UC Browser', 'browser', 'Android', 'mobile', 'Realme'],
  ['Mozilla/5.0 (Linux; Android 12; CPH2219) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.129 Mobile Safari/537.36 OPR/70.3.3653.66287', 'Opera Mobile', 'browser', 'Android', 'mobile', 'OPPO'],
  ['Mozilla/5.0 (Linux; Android 10; VOG-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.88 HuaweiBrowser/13.0.5.303 Mobile Safari/537.36', 'Huawei Browser', 'browser', 'Android', 'mobile', 'Huawei'],
  ['Mozilla/5.0 (Linux; Android 13; moto g power 5G - 2023) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36', 'Chrome Mobile', 'browser', 'Android', 'mobile', 'Motorola'],
  ['Mozilla/5.0 (Linux; Android 14; LE2113 Build/UKQ1.230924.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.6422.165 Mobile Safari/537.36', 'Chrome WebView', 'browser', 'Android', 'mobile', 'OnePlus'],
  ['Mozilla/5.0 (Linux; Android 9; KFMAWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/124.3.1 like Chrome/124.0.6367.179 Safari/537.36', 'Amazon Silk', 'browser', 'Fire OS', 'tablet', 'Amazon'],
  ['Mozilla/5.0 (Linux; U; Android 4.0.3; ko-kr; LG-L160L Build/IML74K) AppleWebkit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30', 'Android Browser', 'browser', 'Android', 'mobile', 'LG'],
  ['Opera/9.80 (Android; Opera Mini/36.2.2254/119.132; U; id) Presto/2.12.423 Version/12.16', 'Opera Mini', 'browser', 'Android', 'mobile'],
  ['Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 EdgA/124.0.2478.62', 'Edge Mobile', 'browser', 'Android', 'mobile', 'Google'],
  ['Mozilla/5.0 (Linux; Android 13; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile DuckDuckGo/5 Safari/537.36', 'DuckDuckGo', 'browser', 'Android', 'mobile'],
  ['Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Mobile Safari/537.36 Edge/15.15254', 'Edge (EdgeHTML)', 'browser', 'Windows Phone', 'mobile', 'Microsoft'],
  ['Mozilla/5.0 (BB10; Touch) AppleWebKit/537.35+ (KHTML, like Gecko) Version/10.3.3.2205 Mobile Safari/537.35+', 'BlackBerry Browser', 'browser', 'BlackBerry OS', 'mobile', 'BlackBerry'],
  ['Mozilla/5.0 (Mobile; Nokia 8110 4G; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5', 'Firefox Mobile', 'browser', 'KaiOS', 'mobile'],
  ['Mozilla/5.0 (Linux; Android 12; HarmonyOS; NOH-AN00) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.88 HuaweiBrowser/14.0.0.321 Mobile Safari/537.36', 'Huawei Browser', 'browser', 'HarmonyOS', 'mobile'],

  // ---- Applications and email clients
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F79 [FBAN/FBIOS;FBAV/468.0.0.34.106;FBBV/608326544;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]', 'Facebook app', 'app', 'iOS', 'mobile'],
  ['Mozilla/5.0 (Linux; Android 13; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.6422.147 Mobile Safari/537.36 Instagram 334.0.0.42.95 Android (33/13; 450dpi; 1080x2177; samsung; SM-A536B; a53x; s5e8825; en_GB; 608720144)', 'Instagram app', 'app', 'Android', 'mobile', 'Samsung'],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_31.5.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/en Region/US', 'TikTok app', 'app', 'iOS', 'mobile'],
  ['Mozilla/5.0 (Linux; Android 12; V2109 Build/SP1A.210812.003; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 MMWEBID/2585 MicroMessenger/8.0.42.2460(0x28002A58) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64', 'WeChat', 'app', 'Android', 'mobile', 'Vivo'],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Teams/1.6.00.4472 Chrome/102.0.5005.197 Electron/19.1.8 Safari/537.36', 'Microsoft Teams', 'app', 'Windows', 'desktop'],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Slack/4.38.125 Chrome/124.0.6367.207 Electron/30.0.6 Safari/537.36', 'Slack', 'app', 'macOS', 'desktop'],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9153 Chrome/124.0.6367.243 Electron/30.1.0 Safari/537.36', 'Discord', 'app', 'Windows', 'desktop'],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) obsidian/1.5.12 Chrome/120.0.6099.283 Electron/28.2.3 Safari/537.36', 'obsidian', 'app', 'Windows', 'desktop'],
  ['Microsoft Office/16.0 (Windows NT 10.0; Microsoft Outlook 16.0.17531; Pro)', 'Microsoft Outlook', 'email client', 'Windows', 'desktop'],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:115.0) Gecko/20100101 Thunderbird/115.12.2', 'Thunderbird', 'email client', 'Windows', 'desktop'],
  ['Spotify/8.9.50 iOS/17.5.1 (iPhone14,5)', 'Spotify', 'app', 'iOS', 'mobile'],
  ['MyBankApp/4.12.0 CFNetwork/1496.0.7 Darwin/23.5.0', 'MyBankApp', 'app', 'Darwin (iOS / macOS)', null, null, '4'],
  ['Dalvik/2.1.0 (Linux; U; Android 13; Pixel 7 Build/TQ3A.230901.001)', 'Dalvik', 'library / tool', 'Android', null, 'Google'],
  ['okhttp/4.12.0', 'okhttp', 'library / tool', null, 'script', null, '4'],
  ['Mozilla/5.0 (Linux; Android 11; AFTKA Build/RS8101.1849N; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0.5359.160 Mobile Safari/537.36', 'Chrome WebView', 'browser', 'Fire OS', 'tv', 'Amazon'],

  // ---- TVs, consoles and other devices
  ['Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.5) AppleWebKit/537.36 (KHTML, like Gecko) 85.0.4183.93/6.5 TV Safari/537.36', null, null, 'Tizen', 'tv', 'Samsung'],
  ['Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36 WebAppManager', 'Chrome', 'browser', 'webOS', 'tv', 'LG'],
  ['Mozilla/5.0 (PlayStation 5 3.21) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15', 'PlayStation Browser', 'browser', 'PlayStation', 'console', 'Sony'],
  ['Mozilla/5.0 (Nintendo Switch; WifiWebAuthApplet) AppleWebKit/609.4 (KHTML, like Gecko) NF/6.0.2.21.3 NintendoBrowser/5.1.0.22474', 'Nintendo Browser', 'browser', 'Nintendo', 'console', 'Nintendo'],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/16.16299', 'Edge (EdgeHTML)', 'browser', 'Xbox', 'console', 'Microsoft'],
  ['Mozilla/5.0 (X11; Linux armv7l) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.225 Safari/537.36 CrKey/1.56.500000 DeviceType/Chromecast', 'Chrome', 'browser', 'Chromecast', 'tv', 'Google'],
  ['Roku/DVP-12.5 (12.5.0.4178-C2)', 'Roku', 'app', 'Roku OS', 'tv', 'Roku'],
  ['Mozilla/5.0 (X11; U; Linux armv7l like Android; en-us) AppleWebKit/531.2+ (KHTML, like Gecko) Version/5.0 Safari/533.2+ Kindle/3.0+', 'Kindle Browser', 'browser', null, 'ereader', 'Amazon'],

  // ---- Crawlers and link previews
  ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'Googlebot', 'bot', null, 'bot', null, '2'],
  ['Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.126 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'Googlebot', 'bot', 'Android', 'bot'],
  ['Googlebot-Image/1.0', 'Googlebot-Image', 'bot', null, 'bot'],
  ['AdsBot-Google (+http://www.google.com/adsbot.html)', 'AdsBot-Google', 'bot', null, 'bot'],
  ['Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36', 'bingbot', 'bot', null, 'bot'],
  ['Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)', 'Yahoo! Slurp', 'bot', null, 'bot'],
  ['DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)', 'DuckDuckBot', 'bot', null, 'bot'],
  ['Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)', 'Baiduspider', 'bot', null, 'bot'],
  ['Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)', 'YandexBot', 'bot', null, 'bot'],
  ['facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'facebookexternalhit', 'bot', null, 'bot'],
  ['Twitterbot/1.0', 'Twitterbot', 'bot', null, 'bot'],
  ['LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)', 'LinkedInBot', 'bot', null, 'bot'],
  ['Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)', 'Slackbot', 'bot', null, 'bot'],
  ['Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)', 'Discordbot', 'bot', null, 'bot'],
  ['WhatsApp/2.23.20.0 A', 'WhatsApp link preview', 'bot', null, 'bot'],
  ['TelegramBot (like TwitterBot)', 'TelegramBot', 'bot', null, 'bot'],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)', 'Applebot', 'bot', 'macOS', 'bot'],
  ['Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)', 'AhrefsBot', 'bot', null, 'bot'],
  ['Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)', 'SemrushBot', 'bot', null, 'bot'],
  ['Mozilla/5.0 (compatible; MJ12bot/v1.4.8; http://mj12bot.com/)', 'MJ12bot', 'bot', null, 'bot'],
  ['Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)', 'GPTBot', 'bot', null, 'bot'],
  ['Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)', 'ClaudeBot', 'bot', null, 'bot'],
  ['Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)', 'PerplexityBot', 'bot', null, 'bot'],
  ['CCBot/2.0 (https://commoncrawl.org/faq/)', 'CCBot', 'bot', null, 'bot'],
  ['Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)', 'Bytespider', 'bot', 'Android', 'bot'],
  ['Mozilla/5.0 (compatible; archive.org_bot +http://archive.org/details/archive.org_bot)', 'archive.org_bot', 'bot', null, 'bot'],
  ['Mozilla/5.0 (compatible; SomeUnknownCrawler/3.2; +https://example.net/crawler)', 'SomeUnknownCrawler', 'bot', null, 'bot', null, '3'],
  ['ExampleSpider (https://example.net/spider)', 'ExampleSpider', 'bot', null, 'bot'],

  // ---- Monitoring and automation
  ['Mozilla/5.0+(compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)', 'UptimeRobot', 'monitoring', null, 'bot'],
  ['Pingdom.com_bot_version_1.4_(http://www.pingdom.com/)', 'Pingdom', 'monitoring', null, 'bot'],
  ['ELB-HealthChecker/2.0', 'ELB-HealthChecker', 'monitoring', null, 'bot'],
  ['kube-probe/1.29', 'kube-probe', 'monitoring', null, 'bot'],
  ['GoogleHC/1.0', 'GoogleHC', 'monitoring', null, 'bot'],
  ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.6478.126 Safari/537.36', 'HeadlessChrome', 'automation', 'Linux', 'desktop'],
  ['Mozilla/5.0 (Unknown; Linux x86_64) AppleWebKit/538.1 (KHTML, like Gecko) PhantomJS/2.1.1 Safari/538.1', 'PhantomJS', 'automation', 'Linux', 'desktop'],

  // ---- Libraries and command-line tools
  ['curl/8.4.0', 'curl', 'library / tool', null, 'script', null, '8'],
  ['Wget/1.21.4', 'Wget', 'library / tool', null, 'script'],
  ['python-requests/2.31.0', 'python-requests', 'library / tool', null, 'script'],
  ['Python-urllib/3.11', 'Python-urllib', 'library / tool', null, 'script'],
  ['Python/3.11 aiohttp/3.9.5', 'aiohttp', 'library / tool', null, 'script'],
  ['python-httpx/0.27.0', 'python-httpx', 'library / tool', null, 'script'],
  ['Scrapy/2.11.2 (+https://scrapy.org)', 'Scrapy', 'library / tool', null, 'script'],
  ['Go-http-client/1.1', 'Go-http-client', 'library / tool', null, 'script'],
  ['Go-http-client/2.0', 'Go-http-client', 'library / tool', null, 'script', null, '2'],
  ['Java/1.8.0_292', 'Java', 'library / tool', null, 'script'],
  ['Apache-HttpClient/4.5.14 (Java/17.0.9)', 'Apache-HttpClient', 'library / tool', null, 'script'],
  ['axios/1.7.2', 'axios', 'library / tool', null, 'script'],
  ['node-fetch/1.0 (+https://github.com/bitinn/node-fetch)', 'node-fetch', 'library / tool', null, 'script'],
  ['PostmanRuntime/7.39.0', 'PostmanRuntime', 'library / tool', null, 'script'],
  ['libwww-perl/6.72', 'libwww-perl', 'library / tool', null, 'script'],
  ['Ruby', 'Ruby', 'library / tool', null, 'script'],
  ['GuzzleHttp/7.8.1 curl/8.5.0 PHP/8.3.6', 'GuzzleHttp', 'library / tool', null, 'script'],
  ['Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.19041.4522', 'PowerShell', 'library / tool', 'Windows', 'desktop'],
  ['Microsoft BITS/7.8', 'Microsoft BITS', 'library / tool', null, 'script'],
  ['Microsoft-CryptoAPI/10.0', 'Microsoft-CryptoAPI', 'library / tool', null, 'script'],
  ['ApacheBench/2.3', 'ApacheBench', 'library / tool', null, 'script'],
  ['git/2.45.2', 'git', 'library / tool', null, 'script'],
  ['aws-cli/2.17.9 Python/3.11.9 Linux/6.5.0 exe/x86_64.ubuntu.22', 'AWS CLI', 'library / tool', 'Linux', 'desktop'],
  ['Debian APT-HTTP/1.3 (2.6.1)', 'Debian APT', 'library / tool', 'Debian', 'desktop'],
  ['SomeInternalService/2.3.1', 'SomeInternalService', 'library / tool', null, 'script', null, '2'],
  ['my-agent', 'my-agent', 'library / tool', null, 'script'],

  // ---- Security scanners
  ['sqlmap/1.8.6#stable (https://sqlmap.org)', 'sqlmap', 'security scanner', null, 'bot'],
  ['Mozilla/5.00 (Nikto/2.5.0) (Evasions:None) (Test:Port Check)', 'Nikto', 'security scanner', null, 'bot'],
  ['Mozilla/5.0 (compatible; Nmap Scripting Engine; https://nmap.org/book/nse.html)', 'Nmap Scripting Engine', 'security scanner', null, 'bot'],
  ['masscan/1.3 (https://github.com/robertdavidgraham/masscan)', 'masscan', 'security scanner', null, 'bot'],
  ['Mozilla/5.0 zgrab/0.x', 'ZGrab', 'security scanner', null, 'bot'],
  ['Nuclei - Open-source project (github.com/projectdiscovery/nuclei)', 'Nuclei', 'security scanner', null, 'bot'],
  ['WPScan v3.8.25 (https://wpscan.com/wordpress-security-scanner)', 'WPScan', 'security scanner', null, 'bot'],
  ['Fuzz Faster U Fool v2.1.0', 'ffuf', 'security scanner', null, 'bot'],
  ['gobuster/3.6', 'gobuster', 'security scanner', null, 'bot'],
  ['feroxbuster/2.10.4', 'feroxbuster', 'security scanner', null, 'bot'],
  ['DirBuster-1.0-RC1 (http://www.owasp.org/index.php/Category:OWASP_DirBuster_Project)', 'DirBuster', 'security scanner', null, 'bot'],
  ['Mozilla/5.0 (compatible; CensysInspect/1.1; +https://about.censys.io/)', 'CensysInspect', 'security scanner', null, 'bot'],
  ['Mozilla/5.0 (compatible; InternetMeasurement/1.0; +https://internet-measurement.com/)', 'InternetMeasurement', 'security scanner', null, 'bot'],
  ['Expanse, a Palo Alto Networks company, searches across the global IPv4 space multiple times per day to identify customers\' presences on the Internet.', 'Expanse', 'security scanner', null, 'bot'],
  ['Mozilla/5.0 (compatible; Acunetix)', 'Acunetix', 'security scanner', null, 'bot'],
];

const failures = [];
let passed = 0;
for (const [ua, client, kind, os, type, vendor, major] of CORPUS) {
  const r = parseUserAgent(ua);
  const problems = [];
  if (client !== null && r.browser.name !== client) problems.push(`client ${JSON.stringify(r.browser.name)} (expected ${JSON.stringify(client)})`);
  if (kind !== null && r.kind !== kind) problems.push(`kind ${JSON.stringify(r.kind)} (expected ${JSON.stringify(kind)})`);
  if (os !== null && r.os.name !== os) problems.push(`OS ${JSON.stringify(r.os.name)} (expected ${JSON.stringify(os)})`);
  if (type !== null && r.device.type !== type) problems.push(`device type ${JSON.stringify(r.device.type)} (expected ${JSON.stringify(type)})`);
  if (vendor && r.device.vendor !== vendor) problems.push(`vendor ${JSON.stringify(r.device.vendor)} (expected ${JSON.stringify(vendor)})`);
  if (major && String(r.browser.version || '').split('.')[0] !== major) problems.push(`version ${JSON.stringify(r.browser.version)} (expected major ${major})`);
  if (problems.length) failures.push(`${ua.slice(0, 110)}\n       ${problems.join('; ')}`); else passed++;
}

// No user agent in the corpus may come back without a client name.
const unnamed = CORPUS.filter(([ua, client]) => client !== null && !parseUserAgent(ua).browser.name).length;
if (unnamed) failures.push(`${unnamed} user agents were not given a client name`); else passed++;

// Many user agents at once: one row per non-empty line, in every output format.
const op = MODULES['Parse User Agent'].func;
const many = CORPUS.map(c => c[0]).join('\n') + '\n\n';
const checks = [
  ['a single user agent keeps the detailed layout', () => /^Browser\n {4}Name: Chrome\n {4}Version: 126\.0\.0\.0\nDevice\n/.test(op(CORPUS[0][0]))],
  ['Auto gives a table for several lines', () => { const rows = op(many).split('\n'); return rows.length === CORPUS.length + 2 && /^Client +Version +Kind +OS/.test(rows[0]); }],
  ['CSV has a header and one row per user agent', () => { const rows = op(many, 'CSV').split('\n'); return rows[0] === 'Client,Version,Kind,OS,OS version,Device,Vendor,Type,Engine,CPU,User agent' && rows.length === CORPUS.length + 1; }],
  ['JSON has one object per user agent', () => { const rows = JSON.parse(op(many, 'JSON')); return rows.length === CORPUS.length && rows[0].Client === 'Chrome' && rows[0]['User agent'] === CORPUS[0][0]; }],
  ['Summary counts every line', () => new RegExp(`^User agents: ${CORPUS.length} \\(`).test(op(many, 'Summary')) && /By kind\n +\d+ {2}/.test(op(many, 'Summary'))],
  ['hundreds of lines are handled', () => op(Array.from({ length: 600 }, (_, i) => CORPUS[i % CORPUS.length][0]).join('\r\n'), 'JSON').length > 100000],
  ['empty input does not fail', () => /Name: unknown/.test(op(''))],
];
for (const [label, check] of checks) { try { if (check()) passed++; else failures.push(label); } catch (e) { failures.push(`${label}: ${e.message}`); } }

for (const f of failures) console.error(`FAIL ${f}`);
console.log(`User agents: ${passed}/${passed + failures.length} checks passed (${CORPUS.length} user agents in the corpus)`);
if (failures.length) process.exitCode = 1;
