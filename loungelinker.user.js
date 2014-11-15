// ==UserScript==
// @name         LoungeLinker
// @namespace    http://your.homepage/
// @version      1
// @description  Adds useful links to csgolounge matches
// @author       Basti
// @match        http://csgolounge.com/
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-body
// @downloadURL  https://raw.githubusercontent.com/basvdaakster/loungelinker/master/loungelinker.user.js
// @updateURL    https://raw.githubusercontent.com/basvdaakster/loungelinker/master/loungelinker.user.js
// ==/UserScript==

var hltvMapping = {
	// csgolounge : hltv
	'mouz': 'mousesports',
	'cph.w': 'cph wolves',
	'vp': 'virtus.pro'
};

var redditRegex = new RegExp('<a class="title may-blank.*?" href="/r/csgobetting/comments/(.*?)" tabindex="1" >(.*?)</a>', 'g');
var hltvRegex = new RegExp('<a href="/match/([\\d\\w\\-\\.\\?]*?)">\\s*<img src="http://static\\.hltv\\.org/.*?" alt="" height="12" width="18" class=""/>\\s*<span style="vertical-align: 10%;">(.*?)</span>\\s*<br/>\\s*<span style="vertical-align: 90%;"><img src="http://static\\.hltv\\.org/.*?" alt="" height="12" width="18" class=""/></span>\\s*<span style="vertical-align: top;">(.*?)</span></a>', 'gi');
var hltvMatches = [];

function getRedditLinks(matchUrl, callback) {
	var cache = GM_getValue(matchUrl + '_reddit');
	if(cache) {
		console.log('Loaded \'' + matchUrl + '\' from cache');
		return callback(JSON.parse(cache));
	}

	var url = 'http://www.reddit.com/r/csgobetting/search?q=selftext:' + encodeURIComponent(matchUrl) + '&sort=top&restrict_sr=on&t=all';
	GM_xmlhttpRequest ({ method: 'GET', url: url, onload: function (response) {
		var matches;
		var links = [];
		while(matches = redditRegex.exec(response.responseText)) {
			if(matches.length == 3) {
				links.push({ url: 'http://www.reddit.com/r/csgobetting/comments/' + matches[1], text: matches[2] });
			}
		}
		GM_setValue(matchUrl + '_reddit', JSON.stringify(links));
		console.log('Cached \'' + matchUrl + '\'');
		callback(links);
	}});
}

function getHltvLink(teamA, teamB, callback) {
	var cache = GM_getValue(teamA + '_' + teamB + '_hltv');
	if(cache) {
		console.log('Loaded \'' + teamA + '_' + teamB + '\' from cache');
		return callback(cache);
	}
	
	teamA = teamA.toLowerCase();
	teamA = hltvMapping[teamA] || teamA;
	teamB = teamB.toLowerCase();
	teamB = hltvMapping[teamB] || teamB;

	if(hltvMatches.length > 0) {
		for(var i = 0; i < hltvMatches.length; i++) {
			if(hltvMatches[i].indexOf(teamA) != -1 && hltvMatches[i].indexOf(teamB) != -1) {
				var link = 'http://www.hltv.org/match/' + hltvMatches[i][2];
				GM_setValue(teamA + '_' + teamB + '_reddit', link);
				console.log('Cached \'' + teamA + '_' + teamB + '\'');
				return callback(link);
			}
		}
		callback(null);
	}
	else {
		callback(null);
	}
}

GM_xmlhttpRequest ({ method: 'GET', url: 'http://www.hltv.org/', onload: function (response) {
	var hltvSource = response.responseText.replace(/[\r\n]/g, '');
	
	var matches;
	while(matches = hltvRegex.exec(hltvSource)) {
		if(matches.length == 4) {
			hltvMatches.push([ matches[2].toLowerCase(), matches[3].toLowerCase(), matches[1] ]);
		}
	}
	
	addLinks();
}});

function addLinks() {
	$('.matchmain').each(function() {
		var me = $(this);
		var matchLeft = me.find('.matchleft');
		
		var container = $('<div style="font-size: 75%; color: black"></div>');
		matchLeft.find('a').append(container);
		
		var matchUrl = 'http://csgolounge.com/' + me.find('.matchleft a').attr('href');
		var teams = [ matchLeft.find('.teamtext b')[0].innerHTML.trim(), matchLeft.find('.teamtext b')[1].innerHTML.trim() ];
		
		var redditContainer = $('<div>');
		var hltvContainer = $('<div>');
		
		var redditDone = false;
		var hltvDone = false;
		
		function finish() {
			if(redditDone && hltvDone) {
				container.append(redditContainer);
				container.append(hltvContainer);
			}
		}
		
		getRedditLinks(matchUrl, function(links) {
			if(links.length > 0) {
				var header = $('<strong style="width: 100%; color: #888888; font-weight: bold">/r/csgobetting:</strong>');
				redditContainer.append(header);
				
				for(var i = 0; i < links.length; i++) {
					var a = $('<span onclick="window.open(\'' + links[i].url + '\', \'_blank\');return false" style="width: 100%; float: left">' + links[i].text + '</span>');
					redditContainer.append(a);
				}
			}
			
			redditDone = true;
			finish();
		});
	
		getHltvLink(teams[0], teams[1], function(link) {
			if(link) {
				var header = $('<strong style="width: 100%; color: #888888; font-weight: bold">HLTV:</strong>');
				hltvContainer.append(header);
				var a = $('<span onclick="window.open(\'' + link + '\', \'_blank\');return false" style="width: 100%; float: left">' + link + '</span>');
				hltvContainer.append(a);
			}
			
			hltvDone = true;
			finish();
		});
	});
}