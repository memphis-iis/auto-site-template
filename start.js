var top = window || this;

(function(module){
    //Simple type 4 guid generation (used for unique div id's for our HTML parsing)
    function guid() {
        if (crypto && crypto.getRandomValues) {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = crypto.getRandomValues(new Uint8Array(1))[0]%16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });
        }
        else {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });
        }
    }

    // Read a page's GET URL variables and return them as an associative array.
    function getUrlVars(){
        var vals = {};
        var href = "" + window.location.href;
        var qs = href.substring(href.indexOf('?') + 1);

        _.forEach(qs.split('&'), function(entry, idx) {
            var pos = entry.indexOf('=');
            var name = _.trim(entry.substring(0, pos));
            var value = _.trim(entry.substring(pos + 1));
            vals[name] = value;
        });

        console.log("URL vals", vals);
        return vals;
    }

    //Given a 'raw' HTML string, return a jQuery object representing eveything
    //within the body tag
    function parseHtmlPage(content) {
        //Get the HTML inside the body tag
        var search = content.toLowerCase();
        var start = search.indexOf('<body>') + 6;
        if (start > 5) {
            var end = search.indexOf('</body>');
            content = content.slice(start, end);
        }

        //Append everything to a 'fake' parent so that queries look like
        //they're relative to the body tag (and look like the jQuery selectors
        //that everyone is used to)
        return $("<div id='pageParent_" + guid() + "'></div>").append(
            $(content)
        );
    }

    //Given a jQuery selector result for an Apache index page, return an array
    //of all directories listed (except the "parent directory")
    function apacheIndexDirs(jqueryPage) {
        var dirs = [];

        jqueryPage.find("table tr").each(function(rowidx, rowele){
            if (rowidx < 1)
                return;

            var cells = $(rowele).find("td");
            if (cells.length != 5)
                return;

            var alt = cells.children("img").first().attr("alt");
            if (alt == "[PARENTDIR]") {
                return; //Parent directory detection #1
            }

            if (alt == "[DIR]") {
                var anchor = cells.eq(1).find("a").first();
                if (anchor.text() == "Parent Directory") {
                    return; //Parent directory detection #2
                }
                var dir = anchor.attr("href");
                if (!!dir) {
                    dirs.push(dir);
                }
            }
        });

        return dirs;
    }

    //Handle a single directory entry in the main Apache index we're supposed
    //to be fronting. We are given a jQuery object to target
    function processTopLevelDir(dirUrl, target) {
        console.log("Processing top-level dir", dirUrl);

        //We assume that the top level dir is a decent description
        var name = _(decodeURIComponent(dirUrl)).chain().trim().trim('/').value();

        //What we actually want to do
        function addDirEntry(finalUrl) {
            console.log("ADD", finalUrl, name);
            if (!finalUrl || !name || finalUrl == "/") {
                console.log("SKIPPING");
                return;
            }
            target.append(
                $("<li></li>").append(
                    $("<a></a>").attr('href', finalUrl).text(name)
                )
            );
        }

        // Default to using dirUrl. But we'll check what we get back for the
        // directories. If is NOT an Apache index, we're done. If it is, we
        // look at the list of entries (removing desktop.ini). If there's a
        // single directory, we use that
        return $.get(dirUrl, function(data) {
            var page = parseHtmlPage(data);

            // Allow an index page to specify that it not be shown with a div
            // that has the "skipldc" class
            var skipCount = page.find('.skipldc').size();
            if (skipCount) {
                console.log('Skipping', dirUrl, 'per .skipldc count > 0');
                return;
            }

            var address = page.find("address").text();
            if (address || address.indexOf("Apache") >= 0) {
                var dirs = apacheIndexDirs(page);
                console.log("Checked", dirUrl, "found dirs", dirs);
                if (dirs.length == 1) {
                    dirUrl += dirs[0];
                }
            }

            addDirEntry(dirUrl);
        });
    }

    function cookieCheck(cookieName) {
        cookieName = encodeURIComponent(cookieName);
        console.log("PRE-COOKIE", document.cookie);

        var cookieValue = _(document.cookie.split(';')).chain()
            .map(function(entry){
                var pos = entry.indexOf('=');
                var cook = {
                    'name': _.trim(entry.substring(0, pos)),
                    'value': _.trim(entry.substring(pos + 1))
                };
                console.log(cook);
                return cook;
            })
            .find('name', cookieName)
            .result('value')
            .value();

        var ret = (!!cookieValue);
        console.log("COOKIE:", cookieName, cookieValue, ret);

        if (!!getUrlVars().nocookie) {
            console.log("Overriding cookie - we'll pretend like it isn't there");
            ret = false;
        }

        //Value of true for root path, expire in 180 days
        document.cookie = cookieName + "=true; path=/; expires=" +
            new Date(new Date().getTime() + (180 * 24 * 60 * 60 * 1000)).toGMTString();

        return ret;
    }

    //Called by the HTML page that wants to use us. Currently params expects:
    //  fileList - a jQuery selector where we can insert the list of links to
    //             indexed data
    //  tosModal - a jQuery selector indicating the Bootstrap modal we should
    //             show with the Terms of Service
    module.doInit = function(params) {
        //Provide default values for expected params
        params = _.extend({
            fileList: '',
            tosModal: ''
        }, params);

        //Clear our target and set up with the necessary contents
        var dirTarget = $('<ul></ul>');
        $(params.fileList).html('').append(dirTarget);

        //First, get the apache index and then process all subdirectories
        console.log("Processing Apache Index File");
        $.get('.', function(data) {
            var page = parseHtmlPage(data);

            var queries = [];
            _.forEach(apacheIndexDirs(page), function(dir, idx) {
                var q = processTopLevelDir(dir, dirTarget);
                if (!!q) {
                    queries.push(q);
                }
            });

            $.when(queries, function() {
                //All queries complete - sort the ul
                var items = dirTarget.find('li').get();
                items.sort(function(a, b) {
                    var keyA = $(a).text();
                    var keyB = $(b).text();

                    if (keyA < keyB) return -1;
                    else if (keyA > keyB) return 1;
                    else return 0;
                });
                dirTarget.clear();
                $.each(items, function(i, li) {
                    dirTarget.append(li);
                });
            });
        });

        if (!cookieCheck("seenTos")) {
            $(params.tosModal).modal({
                show: true,
                backdrop: true,
                keyboard: true
            });
        }
    };
})(top);
