/**
 * @todo: test directive
 * @todo: test controller
 */
describe('jb.autoTextInput', function(){
    var   $controller
        , inputController
        , $scope
        , formEvents;

    beforeEach(module('jb.backofficeFormEvents'));
    beforeEach(module('jb.backofficeAutoFormElement'));

    beforeEach(inject(function(_$controller_, _$rootScope_, _backofficeFormEvents_){
        $controller = _$controller_;
        $scope = _$rootScope_.$new();
        formEvents = _backofficeFormEvents_;

        inputController = $controller('AutoTextInputController', {
              $scope    : $scope
            , $attrs    : {}
            , backofficeFormEvents : formEvents
        });
    }));
    it('should be defined', function(){
        expect(inputController).toBeDefined();
    });

    it('exposes an init method', function(){
        expect(inputController.init).toBeFunction();
    });

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
    });
});