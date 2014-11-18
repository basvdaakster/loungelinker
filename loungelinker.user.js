// ==UserScript==
// @name         LoungeLinker
// @namespace    https://github.com/basvdaakster/
// @version      0.54
// @description  Adds useful links to csgolounge matches
// @author       Basti
// @match        http://csgolounge.com/
// @match        http://csgolounge.com/myprofile
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_info
// @run-at       document-body
// @downloadURL  https://raw.githubusercontent.com/basvdaakster/loungelinker/master/loungelinker.user.js
// @updateURL    https://raw.githubusercontent.com/basvdaakster/loungelinker/master/loungelinker.user.js
// @require      https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js
// ==/UserScript==
var version = GM_info && GM_info['script'] && GM_info['script']['version'] ? parseFloat(GM_info['script']['version']) : 0;

var lastUpdateCheck = GM_getValue('cache_lastupdate');
if(!lastUpdateCheck || Date.now() - lastUpdateCheck > 1000 * 60 * 60 * 24) {
	GM_xmlhttpRequest({ method: 'GET', url: 'https://raw.githubusercontent.com/basvdaakster/loungelinker/master/loungelinker.user.js?'+Math.random(), onload: function(response) {
		var versionMatch = /@version\s+(\d+(?:\.\d+))/.exec(response.responseText);console.log(response);
		if(versionMatch && versionMatch.length == 2) {
			if(parseFloat(versionMatch[1]) > version) {
				var notification = $('<div>');
				notification.css({
					position: 'absolute',
					left: '0px',
					top: '0px',
					padding: '5px',
					fontWeight: 'bold',
					background: 'rgba(0, 0, 0, 0.5)',
					color: '#ffffff'
				});
				notification.text('A new version of LoungeLinker is available, please update via the Tamper/Greasemonkey menu');
				$('body').append(notification);
				notification.fadeOut(5000);
			}
		}
		GM_setValue('cache_lastupdate', Date.now());
	} });
}

function cacheValue(key, value) {
	GM_setValue('cache_' + key, value);
}

function getCachedValue(key, defaultValue) {
	return GM_getValue('cache_' + key, defaultValue);
}

function clearStorage() {
	var keys = GM_listValues();
	for(var i in keys) {
		if(key == 'hltv_mapping' || key == 'dmg_mapping') {
			continue;
		}
		var key = keys[i];
		GM_deleteValue(key);
		console.log('Deleting \'' + key + '\'');
	}
}

function clearCache() {
	var keys = GM_listValues();
	for(var i in keys) {
		var key = keys[i];
		if(key.indexOf('cache_') == 0) {
			GM_deleteValue(key);
			console.log('Deleting cache for \'' + key + '\'');
		}
	}
}

if(GM_getValue('version') < version) {
	console.log('version < ' + version);
	clearStorage();
}
GM_setValue('version', version);

console.log('LoungeLinker v' + version + ' started');

/* Check cache for old values */
var keys = GM_listValues();
for(var i in keys) {
	var key = keys[i];
	if(key.indexOf('cache_') == 0) {
		var value = GM_getValue(key);
		
		// If value is undefined, null or not an array or not an array of length 2 remove it
		if(value === undefined || value === null || !value.join || value.length < 2) {
			console.log('Deleting cache from old version for \'' + key + '\'');
			GM_deleteValue(key);
		}
		else if(Date.now() - value[1] > 1000 * 60 * 60 * 48) {
			// Delete cache older than 2 days
			console.log('Deleting cache for \'' + key + '\'');
			GM_deleteValue(key);
		}
	}
}

/* CSS */
var linkStyle = 'font-weight: bold; text-shadow: -1px 1px #ccc !important';
var hoverStyle = '.ll-hover { text-decoration: none; } .ll-hover:hover { text-decoration: underline; }';
$('head').append($('<style>' + hoverStyle + '</style>'));

/* Used to convert team names */
var hltvMapping = {
    // csgolounge : hltv
    'mouz': 'mousesports',
    'cph.w': 'cph wolves',
    'vp': 'virtus.pro',
	'platinum': 'platinium'
};

var dmgMapping = {
	// csgolounge : 99dmg
	'cph.w': 'cph',
	'vp': 'virtus',
	'lc': 'london conspiracy',
	'ams': 'animosity',
	'gb': 'gbots'
};

var hltvMappingRaw = GM_getValue('hltv_mapping');
if(hltvMappingRaw) {
	hltvMapping = JSON.parse(hltvMappingRaw);
}

var dmgMappingRaw = GM_getValue('dmg_mapping');
if(dmgMappingRaw) {
	dmgMapping = JSON.parse(dmgMappingRaw);
}

/* Used for scraping */
var redditRegex = new RegExp('<a class="title may-blank.*?" href="/r/csgobetting/comments/(.*?)" tabindex="1" >(.*?)</a>', 'g');
var hltvRegex = new RegExp('<a href="/match/([\\w\\-\\.\\?]*?)">\\s*<img src="http://static\\.hltv\\.org/.*?" alt="" height="12" width="18" class=""/>\\s*<span style="vertical-align: 10%;">(.*?)</span>\\s*<br/>\\s*<span style="vertical-align: 90%;"><img src="http://static\\.hltv\\.org/.*?" alt="" height="12" width="18" class=""/></span>\\s*<span style="vertical-align: top;">(.*?)</span></a>', 'gi');
var hltvUpcomingRegex = new RegExp('<a href="/match/([\\w\\-\\.\\?]*?)"> <img src="http://static\\.hltv\\.org/.*?" alt="" height="12" width="18" class=""/> <span style="vertical-align: 10%;">(.*?)</span> <div style="margin-top:-2px;"></div></a><div style="_padding-top:5px;_padding-bottom:5px;margin-top:5px;margin-bottom:5px;color:black;"><a style="color:black;" href="/match/[\\w\\-\\.\\?]*?">[\\w\\-\\.\\?]*?</a></div><a href="/match/[\\w\\-\\.\\?]*?" > <span style="vertical-align: 90%;"><img src="http://static\\.hltv\\.org/.*?" alt="" height="12" width="18" class=""/></span> <span style="vertical-align: top;">(.*?)</span></a>', 'gi');
var hltvMatches = [];

function getRedditLinks(matchUrl, callback) {
    var cache = getCachedValue(matchUrl + '_reddit');
    if(cache) {
        return callback(JSON.parse(cache[0]));
    }

    var url = 'http://www.reddit.com/r/csgobetting/search?q=selftext:' + encodeURIComponent(matchUrl) + '&sort=top&restrict_sr=on&t=week';
    GM_xmlhttpRequest ({ method: 'GET', url: url, onload: function (response) {
        var matches;
        var links = [];
        while(matches = redditRegex.exec(response.responseText)) {
            if(matches.length == 3) {
                links.push({ url: 'http://www.reddit.com/r/csgobetting/comments/' + matches[1], text: matches[2] });
            }
        }
        cacheValue(matchUrl + '_reddit', [ JSON.stringify(links), Date.now() ]);
        callback(links);
    }, onerror: function() { callback(null); }});
}

function getHltvLink(teamA, teamB, callback) {
    teamA = teamA.toLowerCase();
    teamA = hltvMapping[teamA] || teamA;
    teamB = teamB.toLowerCase();
    teamB = hltvMapping[teamB] || teamB;
	
    var cache = getCachedValue(teamA + '_' + teamB + '_hltv');
    if(cache) {
        return callback(cache[0]);
    }

    if(hltvMatches.length > 0) {
        for(var i = 0; i < hltvMatches.length; i++) {
            if(hltvMatches[i].indexOf(teamA) != -1 && hltvMatches[i].indexOf(teamB) != -1) {
                var link = 'http://www.hltv.org/match/' + hltvMatches[i][2];
                cacheValue(teamA + '_' + teamB + '_hltv', [ link, Date.now() ]);
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
	var cache = getCachedValue(team + '_99dmg');
	if(cache) {
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
					cacheValue(team + '_99dmg', [ link, Date.now() ]);
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
		
		function createLink(url, text) {
			var a = $('<span onclick="window.open(\'' + url + '\', \'_blank\');return false" style="width: 100%; float: left">' + text + '</span>');
			if(!GM_getValue('settings_compatibility', false)) {
				a = $('<a href="' + url + '" target="_blank">' + text + '</a>');
			}
			a.attr('style', linkStyle);
			a.addClass('ll-hover');
			return a;
		}

		if(GM_getValue('settings_reddit', true)) {
			getRedditLinks(matchUrl, function(links) {
				if(links.length > 0) {
					for(var i = 0; i < links.length; i++) {
						var a = createLink(links[i].url, links[i].text);
						redditContainer.append('<b style="margin-right: 4px">Reddit:</b>').append(a).append($('<br>'));
					}
				}
			});
		}

		if(GM_getValue('settings_hltv', true)) {
			getHltvLink(teams[0], teams[1], function(link) {
				if(link) {
					var a = createLink(link, '<b>HLTV</b>');
					hltvContainer.append(a);
				}
			});
		}
		
		if(GM_getValue('settings_99dmg', true)) {
			get99DmgTeamLink(teams[0], function(link) {
				if(link) {
					dmgContainer.show();
					var a = createLink(link, teams[0]).css({ 'marginRight': '4px', 'float': 'none' });
					dmgContainer.append(a);
				}
			});
			
			get99DmgTeamLink(teams[1], function(link) {
				if(link) {
					dmgContainer.show();
					var a = createLink(link, teams[1]).css({ 'marginRight': '4px', 'float': 'none' });
					dmgContainer.append(a);
				}
			});
		}
    });
}

function addSettings() {
	var settings = $('<div>');
	settings.append($('<h1>LoungeLinker v' + version + '</h1>'));
	
	/* General settings */
	settings.append($('<h2 style="font-weight: bold">General settings</h2>'));
	var saveIndicator = $('<span style="padding-top: 8px">Settings saved!</span>');
	saveIndicator.hide();
	
	var redditCheckbox = $('<input type="checkbox" id="ll_reddit">');
	var hltvCheckbox = $('<input type="checkbox" id="ll_hltv">');
	var dmgCheckbox = $('<input type="checkbox" id="ll_99dmg">');
	var compatCheckbox = $('<input type="checkbox" id="ll_compat">');
	
	redditCheckbox.prop('checked', GM_getValue('settings_reddit', true));
	hltvCheckbox.prop('checked', GM_getValue('settings_hltv', true));
	dmgCheckbox.prop('checked', GM_getValue('settings_99dmg', true));
	compatCheckbox.prop('checked', GM_getValue('settings_compatibility', false));
	
	var saveButton = $('<a href="#" class="button">Save</a>');
	saveButton.click(function() {
		GM_setValue('settings_reddit', redditCheckbox.prop('checked'));
		console.log('\'settings_reddit\' set to \'' + redditCheckbox.prop('checked') + '\'');
		GM_setValue('settings_hltv', hltvCheckbox.prop('checked'));
		console.log('\'settings_hltv\' set to \'' + hltvCheckbox.prop('checked') + '\'');
		GM_setValue('settings_99dmg', dmgCheckbox.prop('checked'));
		console.log('\'settings_99dmg\' set to \'' + dmgCheckbox.prop('checked') + '\'');
		GM_setValue('settings_compatibility', compatCheckbox.prop('checked'));
		console.log('\'settings_compatibility\' set to \'' + compatCheckbox.prop('checked') + '\'');
			
		saveIndicator.show().fadeOut();
	});
	
	var compatText = 'When disabled LoungeAssistant might pick up LoungeLinker\'s links as match links causing it to fail displaying the best-of type of the match.';
	
	settings.append($('<div>').append(redditCheckbox).append('<label for="ll_reddit">Show reddit links</label>'))
			.append($('<div>').append(hltvCheckbox).append('<label for="ll_hltv">Show hltv links</label>'))
			.append($('<div>').append(dmgCheckbox).append('<label for="ll_99dmg">Show 99damage links</label>'))
			.append($('<div>').append(compatCheckbox).append('<label for="ll_compat" title="' + compatText + '">Enable compatibility mode</label>'))
			.append($('<div style="overflow: hidden">').append(saveButton).append(saveIndicator));
	
	/* HLTV Mappings */
	settings.append('<br>').append('<br>');
	settings.append($('<div>').append($('<h2 style="font-weight: bold">HLTV Mappings</h2>')));
	
	var hltvTable = $('<table style="width: 100%"></table>');
	hltvTable.append($('<thead><tr style="font-weight: bold"><td>CSGO Lounge</td><td>HLTV</td><td>&nbsp;</td></tr></thead>'));
	var hltvTableBody = $('<tbody>');
	var hltvCsgoInput = $('<input style="width: 90%" type="text">');
	var hltvHltvInput = $('<input style="width: 90%" type="text">');
	var hltvAddButton = $('<button>Add</button>');
	var hltvError = $('<span style="padding-top: 8px; color: red"></span>');
	
	function addHltvMapping(a, b) {
		if(a.trim().length == 0 || b.trim().length == 0) {
			hltvError.css('color', 'red').text('Please fill in both textfields');
		}
		else if(hltvMapping[a.trim()]) {
			hltvError.css('color', 'red').text('A mapping for \'' + a + '\' already exists');
		}
		else {
			hltvMapping[a] = b.trim();
			GM_setValue('hltv_mapping', JSON.stringify(hltvMapping));
			hltvError.css('color', 'white').text('Mappings saved!');
			makeHltvTable();
		}
	}
	
	function makeHltvTable() {
		hltvTableBody.empty();
		for(var key in hltvMapping) {
			hltvTableBody.append($('<tr>')
				.append($('<td>' + key + '</td>'))
				.append($('<td>' + hltvMapping[key] + '</td>'))
				.append($('<td><a href="#">Delete</a></td>').click(function() {
					delete hltvMapping[key];
					GM_setValue('hltv_mapping', JSON.stringify(hltvMapping));
					makeHltvTable();
				})));
		}
		hltvTableBody.append($('<tr>')
			.append($('<td>').append(hltvCsgoInput))
			.append($('<td>').append(hltvHltvInput))
			.append($('<td>').append(hltvAddButton)));
		hltvAddButton.click(function() {
			addHltvMapping(hltvCsgoInput.val(), hltvHltvInput.val());
		});
	}
	makeHltvTable();
			
	settings.append(hltvTable.append(hltvTableBody));
	settings.append(hltvError);
	
	/* Dmg Mappings */
	settings.append('<br>').append('<br>');
	settings.append($('<div>').append($('<h2 style="font-weight: bold">99Damage Mappings</h2>')));
	
	var dmgTable = $('<table style="width: 100%"></table>');
	dmgTable.append($('<thead><tr style="font-weight: bold"><td>CSGO Lounge</td><td>99Damage</td><td>&nbsp;</td></tr></thead>'));
	var dmgTableBody = $('<tbody>');
	var dmgCsgoInput = $('<input style="width: 90%" type="text">');
	var dmgDmgInput = $('<input style="width: 90%" type="text">');
	var dmgAddButton = $('<button>Add</button>');
	var dmgError = $('<span style="padding-top: 8px; color: red"></span>');
	
	function addDmgMapping(a, b) {
		if(a.trim().length == 0 || b.trim().length == 0) {
			dmgError.css('color', 'red').text('Please fill in both textfields');
		}
		else if(hltvMapping[a.trim()]) {
			dmgError.css('color', 'red').text('A mapping for \'' + a + '\' already exists');
		}
		else {
			dmgMapping[a] = b.trim();
			GM_setValue('dmg_mapping', JSON.stringify(hltvMapping));
			dmgError.css('color', 'white').text('Mappings saved!');
			makeDmgTable();
		}
	}
	
	function makeDmgTable() {
		dmgTableBody.empty();
		for(var key in dmgMapping) {
			dmgTableBody.append($('<tr>')
				.append($('<td>' + key + '</td>'))
				.append($('<td>' + dmgMapping[key] + '</td>'))
				.append($('<td><a href="#">Delete</a></td>').click(function() {
					delete dmgMapping[key];
					GM_setValue('dmg_mapping', JSON.stringify(dmgMapping));
					makeDmgTable();
				})));
		}
		dmgTableBody.append($('<tr>')
			.append($('<td>').append(dmgCsgoInput))
			.append($('<td>').append(dmgDmgInput))
			.append($('<td>').append(dmgAddButton)));
		dmgAddButton.click(function() {
			addDmgMapping(dmgCsgoInput.val(), dmgDmgInput.val());
		});
	}
	makeDmgTable();
	
	dmgAddButton.click(function() {
		if(dmgMapping[dmgCsgoInput.val().trim()]) {
			dmgError.css('color', 'red').text('A mapping for \'' + dmgCsgoInput.text() + '\' already exists').show().fadeOut();
		}
		else if(dmgCsgoInput.val().trim().length == 0 || dmgDmgInput.val().trim().length == 0) {
			dmgError.css('color', 'red').text('Please fill in both textfields').show().fadeOut();
		}
		else {
			dmgMapping[dmgCsgoInput.val().trim()] = dmgDmgInput.val().trim();
			GM_setValue('dmg_mapping', JSON.stringify(dmgMapping));
			dmgError.css('color', 'white').text('Mappings saved!').show().fadeOut();
			makeDmgTable();
		}
	});
			
	settings.append(dmgTable.append(dmgTableBody));
	settings.append(dmgError);
	
	
	/* Tools */
	settings.append('<br>').append('<br>');
	settings.append($('<div>').append('<br>').append($('<h2 style="font-weight: bold">Tools</h2>')));
	
	settings.append('<br>').append($('<div>').append($('<a class="button">Clear cache</a>').click(function() {
		clearCache();
	})).append($('<a class="button">Clear cache & settings</a>').click(function() {
		clearStorage();
	
		redditCheckbox.prop('checked', GM_getValue('settings_reddit', true));
		hltvCheckbox.prop('checked', GM_getValue('settings_hltv', true));
		dmgCheckbox.prop('checked', GM_getValue('settings_99dmg', true));
		compatCheckbox.prop('checked', GM_getValue('settings_compatibility', false));
	})));

	var tabButton = $('<a class="button">LoungeLinker</a>');
	tabButton.click(function() {
		$('#ajaxCont').empty();
		$('#ajaxCont').append(settings);
	});
	$('.box-shiny').append(tabButton);
}

if(window.location.href.indexOf('/myprofile') != -1) {
	addSettings();
}
else {
	// If hltv links are enabled we should load all the hot matches before continuing
	if(GM_getValue('settings_hltv', true)) {
		GM_xmlhttpRequest({ method: 'GET', url: 'http://www.hltv.org/', onload: function (response) {
			var hltvSource = response.responseText.replace(/[\r\n]/g, '');
			
			var matches;
			while(matches = hltvRegex.exec(hltvSource)) {
				if(matches.length == 4) {
					hltvMatches.push([ matches[2].toLowerCase(), matches[3].toLowerCase(), matches[1] ]);
				}
			}
			
			while(matches = hltvUpcomingRegex.exec(hltvSource)) {
				if(matches.length >= 4) {
					hltvMatches.push([ matches[2].toLowerCase(), matches[3].toLowerCase(), matches[1] ]);
				}
			}
			console.log(hltvMatches);
			
			addLinks();
		}, onerror: function() { addLinks(); }});
	}
	else {
		addLinks();
	}
}