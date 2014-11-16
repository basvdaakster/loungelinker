// ==UserScript==
// @name         LoungeLinker
// @namespace    https://github.com/basvdaakster/
// @version      1.1
// @description  Adds useful links to csgolounge matches
// @author       Basti
// @match        http://csgolounge.com/
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @run-at       document-body
// @downloadURL  https://raw.githubusercontent.com/basvdaakster/loungelinker/master/loungelinker.user.js
// @updateURL    https://raw.githubusercontent.com/basvdaakster/loungelinker/master/loungelinker.user.js
// ==/UserScript==

var values = GM_listValues();
for(var i in values) {
	var key = values[i];
	var value = GM_getValue(key);
	
	if(!value || !value.join || value.length < 2) {
		console.log('Deleting cache from old version for \'' + key + '\'');
		GM_deleteValue(key);
	}
	else if(Date.now() - value[1] > 1000 * 60 * 60 * 24) {
		console.log('Deleting cache for \'' + key + '\'');
		GM_deleteValue(key);
	}
}

var hltvMapping = {
    // csgolounge : hltv
    'mouz': 'mousesports',
    'cph.w': 'cph wolves',
    'vp': 'virtus.pro'
};

var gopherMapping = {
    'area51': 'Area51',
    'bst': 'BST',
    'cloud9': 'Cloud9',
    'cph.w': 'Copenhagen Wolves',
    'dat': 'dAT Team',
    'epsilon': 'Epsilon eSports',
    'esc': 'ESC Gaming',
    'exertus': 'Exertus',
    'fnatic': 'fnatic',
    'global gaming': 'Global Gaming',
    'hr': 'HellRaisers',
    'ibp': 'iBUYPOWER',
    'justus pro': 'JusTus Pro',
    'k1ck': 'k1ck eSports Club',
    'ldlc': 'LDLC.com',
    'lc': 'London Conspiracy',
    'lunatik': 'LunatiK eSports',
    'mercenary': 'Mercenary',
    'mouz': 'mousesports',
    'mwnl': 'MWNL',
    'navi': 'Natus Vincere',
    'netcodeguides': 'Netcode Guides',
    'nip': 'Ninjas in Pyjamas',
    'no sir!': 'NO SIR!',
    'nostalgie': 'Nostalgie',
    'over gaming': 'Over Gaming',
    'reliable gaming': 'Reliable Gaming',
    'sapphirekelownadotcom': 'SapphireKelownaDotCom',
    'savage': 'savage',
    'alternate': 'Team ALTERNATE',
    'dignitas': 'Team Dignitas',
    'tempo': 'Tempo',
    'the stream team': 'The Stream Team',
    'titan': 'Titan eSports',
    'vexx': 'VexX',
    'vp': 'Virtus.Pro'
};

var redditRegex = new RegExp('<a class="title may-blank.*?" href="/r/csgobetting/comments/(.*?)" tabindex="1" >(.*?)</a>', 'g');
var hltvRegex = new RegExp('<a href="/match/([\\d\\w\\-\\.\\?]*?)">\\s*<img src="http://static\\.hltv\\.org/.*?" alt="" height="12" width="18" class=""/>\\s*<span style="vertical-align: 10%;">(.*?)</span>\\s*<br/>\\s*<span style="vertical-align: 90%;"><img src="http://static\\.hltv\\.org/.*?" alt="" height="12" width="18" class=""/></span>\\s*<span style="vertical-align: top;">(.*?)</span></a>', 'gi');
var hltvMatches = [];

function getRedditLinks(matchUrl, callback) {
    var cache = GM_getValue(matchUrl + '_reddit');
    if(cache) {
        console.log('Loaded \'' + matchUrl + '_reddit\' from cache');
        return callback(JSON.parse(cache[0]));
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
        GM_setValue(matchUrl + '_reddit', [ JSON.stringify(links), Date.now() ]);
        console.log('Cached \'' + matchUrl + '_reddit\'');
        callback(links);
    }, onerror: function() { callback(null); }});
}

function getHltvLink(teamA, teamB, callback) {
    teamA = teamA.toLowerCase();
    teamA = hltvMapping[teamA] || teamA;
    teamB = teamB.toLowerCase();
    teamB = hltvMapping[teamB] || teamB;
	
    var cache = GM_getValue(teamA + '_' + teamB + '_hltv');
    if(cache) {
        console.log('Loaded \'' + teamA + '_' + teamB + '_hltv\' from cache');
        return callback(cache[0]);
    }

    if(hltvMatches.length > 0) {
        for(var i = 0; i < hltvMatches.length; i++) {
            if(hltvMatches[i].indexOf(teamA) != -1 && hltvMatches[i].indexOf(teamB) != -1) {
                var link = 'http://www.hltv.org/match/' + hltvMatches[i][2];
                GM_setValue(teamA + '_' + teamB + '_hltv', [ link, Date.now() ]);
                console.log('Cached \'' + teamA + '_' + teamB + '_hltv\'');
                return callback(link);
            }
        }
        callback(null);
    }
    else {
        callback(null);
    }
}

/*function getGopherLink(teamA, teamB, callback) {
	var cache = GM_getValue(teamA + '_' + teamB + '_gopher');
    if(cache) {
        console.log('Loaded \'' + teamA + '_' + teamB + '_gopher\' from cache');
        return callback(cache[0]);
    }
	
    teamA = gopherMapping[teamA.toLowerCase()] || 'any team';
    teamB = gopherMapping[teamB.toLowerCase()] || 'any team';
	
    if(teamA != teamB) {
		var formData = new FormData();
		formData.append('Team1', teamA);
		formData.append('Team2', teamB);
		formData.append('map', 'any map');
		formData.append('included_events', '');
		formData.append('excluded_events', '');
		formData.append('excludedmaps', '');
		formData.append('start_date', '');
		formData.append('end_date', '');
	
        GM_xmlhttpRequest({ method: 'POST', url: 'http://csgopher.com/handler.php', data: formData, onload: function(response) {
            console.log(response);
			callback(null);
        }, onerror: function() { callback(null); }});
    }
	else {
		callback(null);
	}
}*/

GM_xmlhttpRequest({ method: 'GET', url: 'http://www.hltv.org/', onload: function (response) {
    var hltvSource = response.responseText.replace(/[\r\n]/g, '');
    
    var matches;
    while(matches = hltvRegex.exec(hltvSource)) {
        if(matches.length == 4) {
            hltvMatches.push([ matches[2].toLowerCase(), matches[3].toLowerCase(), matches[1] ]);
        }
    }
    
    addLinks();
}, onerror: function() { addLinks(); }});

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
                for(var i = 0; i < links.length; i++) {
                    var a = $('<span onclick="window.open(\'' + links[i].url + '\', \'_blank\');return false" style="width: 100%; float: left"><b>Reddit:</b> ' + links[i].text + '</span>');
                    redditContainer.append(a);
                }
            }
            
            redditDone = true;
            finish();
        });
    
        getHltvLink(teams[0], teams[1], function(link) {
            if(link) {
                var a = $('<span onclick="window.open(\'' + link + '\', \'_blank\');return false" style="width: 100%; float: left"><b>HLTV</b></span>');
                hltvContainer.append(a);
            }
            
            hltvDone = true;
            finish();
        });
    });
}