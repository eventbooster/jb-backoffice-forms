/**
 * @todo: test directive
 * @todo: test controller
 * @todo: create an example result of an options call which we can use for the tests
 */
describe('jb.formTextInput', function(){

    var   $controller
        , inputController
        , $scope
        , formEvents
        , $rootScope;

    beforeEach(module('jb.formEvents', 'jb.formComponents'));

    beforeEach(inject([ '$controller', '$rootScope', '$q', 'JBFormComponentsService', function(_$controller_, _$rootScope_, _$q_, JBFormComponentsService){

        $controller = _$controller_;
        $scope      = _$rootScope_.$new();
        $rootScope  = _$rootScope_;

        inputController = $controller('JBFormTextInputController', {
              $scope                : $scope
            , $attrs                : {
                for : 'test'
            }
            , $q                    : _$q_
            , JBFormComponentsService : JBFormComponentsService
        });

    }]));

    describe('JBFormTextInputController', function(){
        it('should be defined', function(){
            expect(inputController).toBeDefined();
        });

        it('exposes an isRequird method which should return true by default (to avoid saving before proper population)', function(){
            expect(inputController.isRequired).toBeFunction();
            expect(inputController.isRequired()).toBeTrue();
        });

        it('should be able to pick the correct options data and adjust its state', function(){
            var options = {
                properties : [
                    {
                          name      : 'test'
                        , nullable  : true
                    }
                ]
            };
            inputController.handleOptionsData(options);
            expect(inputController.isRequired()).toBeFalse();
        });
    });


    it('exposes an isValid method', function(){
        expect(inputController.isValid).toBeFunction();
    });

    /*it('init method emits an event on the scope', function(){
        spyOn($scope, '$emit');
        var   elements = []
            , handlers = [];

        inputController.init($scope);

        expect($scope.$emit).toHaveBeenCalledWith(formEvents.registerComponent, inputController);
        expect(elements).toBeArrayOfSize(1);
        expect(handlers).toBeArrayOfSize(1);
    });*/
});