// ==UserScript==
// @name         LoungeLinker
// @namespace    https://github.com/basvdaakster/
// @version      1.3
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

var dmgMapping = {
	'cph.w': 'cph',
	'vp': 'virtus',
	'lc': 'london conspiracy'
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

function get99DmgTeamLink(team, callback) {
	team = team.toLowerCase();
	team = dmgMapping[team] || team;
	var cache = GM_getValue(team + '_99dmg');
	if(cache) {
        console.log('Loaded \'' + team + '_99dmg\' from cache');
		callback(cache);
	}
	else {
		GM_xmlhttpRequest({ 
			method: 'POST', 
			url: 'http://csgo.99damage.de/ajax/edb_team_ac?type=99damage', 
			data: 'search_ac_check=' + encodeURIComponent(team), 
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
				'Accept': 'application/json, text/javascript, */*; q=0.01',
				'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.131 Safari/537.36'
			},
			onload: function(response) {
				var json = JSON.parse(response.responseText);
				if(json.join && json.length > 0) {
					var link = 'http://csgo.99damage.de/de/edb/team/' + json[0][0];
					GM_setValue(team + '_99dmg', [ link, Date.now() ]);
					console.log('Cached \'' + team + '_99dmg\'');
					callback(link);
				}
				else {
					callback(null);
				}
			}, 
			onerror: function() { 
				callback(null); 
			}
		});
	}
}

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
        var dmgContainer = $('<div>');
	
		container.append(redditContainer);
		container.append(hltvContainer);
		container.append(dmgContainer);
		
		dmgContainer.append($("<b>99Dmg: </b>"));
		dmgContainer.hide();
        
        getRedditLinks(matchUrl, function(links) {
            if(links.length > 0) {
                for(var i = 0; i < links.length; i++) {
                    var a = $('<span onclick="window.open(\'' + links[i].url + '\', \'_blank\');return false" style="width: 100%; float: left"><b>Reddit:</b> ' + links[i].text + '</span>');
                    redditContainer.append(a);
                }
            }
        });
    
        getHltvLink(teams[0], teams[1], function(link) {
            if(link) {
                var a = $('<span onclick="window.open(\'' + link + '\', \'_blank\');return false" style="width: 100%; float: left"><b>HLTV</b></span>');
                hltvContainer.append(a);
            }
        });
		
		get99DmgTeamLink(teams[0], function(link) {
            if(link) {
				dmgContainer.show();
                var a = $('<span onclick="window.open(\'' + link + '\', \'_blank\');return false">' + teams[0] + '</span>');
                dmgContainer.append(a);
            }
		});
		
		get99DmgTeamLink(teams[1], function(link) {
            if(link) {
				dmgContainer.show();
                var a = $('<span onclick="window.open(\'' + link + '\', \'_blank\');return false" style="margin-left: 4px">' + teams[1] + '</span>');
                dmgContainer.append(a);
            }
		});
    });
}