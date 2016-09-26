describe('AutoFormElementController', function(){

    var   $controller
        , $scope
        , $compile

        , controller;

    beforeEach(module('jb.backofficeAutoFormElement'));
    beforeEach(inject(function(_$controller_, _$compile_, _$rootScope_){

        $scope      = _$rootScope_.$new();
        $controller = _$controller_;
        $compile = _$compile_;

        var dependencies = {
              $scope    : $scope
            , $attrs    : {}
            , $compile  : $compile
            , $rootScope : _$rootScope_
        };

        controller = $controller('AutoFormElementController', dependencies);
    }));

    it('should be defined', function(){
        expect(controller).toBeDefined();
    });
});
