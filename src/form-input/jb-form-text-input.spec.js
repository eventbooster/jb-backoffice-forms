/**
 * @todo: test directive
 * @todo: test controller
 * @todo: create an example result of an options call which we can use for the tests
 */
describe('jb.formTextInput', function(){

    var   $controller
        , inputController
        , $scope
        , formEvents;

    beforeEach(module('jb.formEvents', 'jb.formComponents'));

    beforeEach(inject(function(_$controller_, _$rootScope_, _$q_){

        $controller = _$controller_;
        $scope      = _$rootScope_.$new();

        inputController = $controller('JBFormTextInputController', {
              $scope                : $scope
            , $attrs                : {
                for : 'test'
            }
            , $q                    : _$q_
        });

    }));

    describe('JBFormTextInputController', function(){
        it('should be defined', function(){
            expect(inputController).toBeDefined();
        });

        it('should be required by default', function(){
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


    /*it('exposes an isValid method', function(){
        expect(inputController.isValid).toBeFunction();
    });

    The emission of the event is now done using a service. So we should test the service for the key that appeared.

    it('init method emits an event on the scope', function(){
        spyOn($scope, '$emit');
        var   elements = []
            , handlers = [];
        inputController.init(null, {
            register: function(controller){
                elements.push(controller);
            }
            , getEntityName: function(){
                return 'test';
            }
            , getEntityId: function(){
                return 1;
            }
            , registerGetDataHandler: function(handler){
                handlers.push(handler);
            }
        });

        expect($scope.$emit).toHaveBeenCalledWith(formEvents.registerComponent, inputController);
        expect(elements).toBeArrayOfSize(1);
        expect(handlers).toBeArrayOfSize(1);
    });*/
});