/**
 * @todo: add proper tests which test the configuration phase
 */
describe('jb-form-events', function(){

    describe('JBFormEventsProvider', function(){

        var   provider
            , events;

        beforeEach(function(){
            angular.module('testJBFormEvents', [])
                .config(['jbFormEventsProvider', function(theProvider){
                    provider = theProvider;
                }]);
            module('jb.formEvents', 'testJBFormEvents');
            inject(function(){});
        });

        it('allows setting values', function(){
            var   accessor  = 'test'
                , key       = 'test.anEventKey';

            provider.setEventKey(accessor, key);
        });

        it('allows getting values', function(){
            var   accessor  = 'test'
                , key       = 'test.anEventKey';

            provider.setEventKey(accessor, key);
            expect(provider.getEventKeyAt(accessor)).toBe(key);

        });
        it('allows checking values', function(){
            var   accessor  = 'test'
                , key       = 'test.anEventKey';

            expect(provider.hasEventKeyAt(accessor)).toBeFalse();
            provider.setEventKey(accessor, key);
            expect(provider.hasEventKeyAt(accessor)).toBeTrue();

        });

    });


    describe('jbFormEvents', function(){

        var events
            , accessor1 = 'test'
            , accessor2 = 'test2'
            , key1      = 'aSuperLongEventKeyLikelyToBeMisspelled'
            , key2      = 'actryplskdfjhlkj123';

        beforeEach(function(){
            angular.module('testJBFormEvents', [])
                .config(['jbFormEventsProvider', function(theProvider){
                    theProvider.setEventKey(accessor1, key1);
                    theProvider.setEventKey(accessor2, key2);
                }]);
            module('jb.formEvents', 'testJBFormEvents');
            inject(function(_jbFormEvents_){
                events = _jbFormEvents_;
            });
        });

        it('should have the configured values', function(){
            expect(events[accessor1]).toBeDefined();
            expect(events[accessor1]).toBe(key1);
            expect(events[accessor2]).toBeDefined();
            expect(events[accessor2]).toBe(key2);
        });

        it('should freeze the returned events', function(){
           expect(Object.isFrozen(events)).toBeTrue();
        });
    });

    describe('JBFormComponentsService', function(){
        var   service
            , $rootScope
            , events;

        beforeEach(module('jb.formEvents'));
        beforeEach(inject(function(_JBFormComponentsService_, _$rootScope_, _jbFormEvents_){
            service     = _JBFormComponentsService_;
            $rootScope  = _$rootScope_;
            events      = _jbFormEvents_;
        }));

        it('should be defined', function(){
            expect(service).toBeDefined();
        });

        it('should expose a register component method', function(){
            expect(service.registerComponent).toBeFunction();
        });

        it('should emit an event on the parent scope if we register a component', function(){

            var   mockScope     = $rootScope.$new()
                , mockComponent = {};

            spyOn($rootScope, '$emit');
            service.registerComponent(mockScope, mockComponent);
            expect($rootScope.$emit).toHaveBeenCalledWith(events.registerComponent, mockComponent);
        });

        it('should expose a method to create a registry', function(){
            expect(service.registryFor).toBeFunction();
        });

        it('which is bound to the scope', function(){
            var   mockScope     = $rootScope.$new()
                , registry      = service.registryFor(mockScope);

            expect(registry).toBeDefined();
        });
    });
});