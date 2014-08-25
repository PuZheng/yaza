//You need an anonymous function to wrap around your function to avoid conflict
require(['jquery'], function (jQuery) {
    (function($){

        //Attach this new method to jQuery
        $.fn.extend({ 
            
            //This is where you write your plugin's name
            lazyLoad: function() {

                //Iterate over the current set of matched elements
                return this.each(function() {
                    var $obj = $(this);	
                    if ($obj[0].completed) {
                        return;
                    }
                    var $mask = $('<div class="text-center"><i class="fa fa-spinner fa-spin fa-2x"></i></i></div>').css({
                        width: $obj.parent().width()
                    }).appendTo($obj.parent());
                    var src = $obj.attr('src');

                    $obj.hide();
                    $obj.one("load", function () {
                        $mask.remove();
                        $obj.show();
                    }).error(function() {
                        $mask.remove();
                        $obj.show();
                    });
                    if (src.indexOf(".duri") >= 0) {
                        $.get(src).done(function(data){
                            $obj.attr("src", data);
                        }).fail(function(){
                            $obj.attr("src", $obj.data("pic-url"))
                        })
                    }else{
                        $obj.attr("src", src);
                    }
                });
            }
        });
        
    //pass jQuery to the function, 
    //So that we will able to use any valid Javascript variable name 
    //to replace "$" SIGN. But, we'll stick to $ (I like dollar sign: ) )		
    })(jQuery);
});
