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
                return;
            }

            if (alt == "[DIR]") {
                var dir = cells.eq(1).find("a").first().attr("href");
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
        $.get(dirUrl, function(data) {
            var page = parseHtmlPage(data);

            var address = page.find("address").text();
            if (address || address.indexOf("Apache") >= 0) {
                var dirs = apacheIndexDirs(page);
                console.log("Checking dirs", dirs);
                if (dirs.length == 1) {
                    dirUrl += dirs[0];
                }
            }

            addDirEntry(dirUrl);
        });
    }

    //Called by the HTML page that wants to use us. Currently params only
    //expects fileList (a jQuery selector where we can insert the list
    //of links to indexed data)
    module.doInit = function(params) {
        //Provide default values for expected params
        params = _.extend({
            fileList: ''
        }, params);

        //Clear our target and set up with the necessary contents
        var dirTarget = $('<ul></ul>');
        $(params.fileList).html('').append(dirTarget);

        //First, get the apache index and then process all subdirectories
        console.log("Processing Apache Index File");
        $.get('.', function(data) {
            var page = parseHtmlPage(data);
            _.forEach(apacheIndexDirs(page), function(dir, idx) {
                processTopLevelDir(dir, dirTarget);
            });
        });
    };
})(top);
