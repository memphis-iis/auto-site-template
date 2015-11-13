var top = window || this;

(function(module){
    module.doInit = function(params) {
        //Provide default values for expected params
        params = _.extend({
            fileList: '',
            fileDetails: ''
        }, params);

        //TODO: actual init
        $(params.fileList).text("File list here");
        $(params.fileDetails).text("File details here");
    };
})(top);
