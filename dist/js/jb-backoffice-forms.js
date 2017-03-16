(function(undefined){
    "use strict";
    var _module = angular.module('jb.backofficeForms', [ 'jb.formComponents' ]);
})();
( function() {

    'use strict';
    var _module = angular.module('jb.formComponents'
        , [
              'jb.fileDropComponent'
            , 'jb.apiWrapper'
            , 'pascalprecht.translate'
            , 'jb.formEvents'
        ]
    );
} )();

(function(){
    var mod = angular.module('jb.formEvents', []);
    mod.provider('jbFormEvents', function JBFormEventsProvider(){
        var eventKeys = {
            // used to register components, e.g. at the detail view
            registerComponent: 'jb.backoffice-form-event.registerComponent'
        };

        this.setEventKey = function(accessor, key){
            eventKeys[accessor] = key;
        };

        this.hasEventKeyAt = function(accessor){
            return angular.isDefined(eventKeys[accessor]);
        };

        this.getEventKeyAt = function(accessor){
            return eventKeys[accessor];
        };

        this.removeEventKey = function(accessor){
            delete eventKeys[accessor];
        } ;

        this.$get = [function(){
            return Object.freeze(eventKeys);
        }];
    });

    function JBFormComponentsRegistry($q, formEvents, scope){
        this.registeredComponents   = [];
        this.scope                  = scope;
        this.optionsDataHandlers    = [];
        this.getDataHandlers        = [];
        this.$q                     = $q;
        this.formEvents             = formEvents;
        this.unregistrationHandlers  = [];
    }

    JBFormComponentsRegistry.prototype.listen = function(){
        this.scope.$on(this.formEvents.registerComponent, function(event, component, sourceScope){
            console.log('REGISTRATION OF:', component);
            // this check should not be necessary anymore, since we emit the registration event on the parent scope
            if(component === this) return;
            event.stopPropagation();
            sourceScope.$on('$destroy', function(){
                this.unregisterComponent(component);
            }.bind(this));
            this.registerComponent(component);
        }.bind(this));
        return this;
    };

    JBFormComponentsRegistry.prototype.registerComponent = function(component){
        this.registeredComponents.push(component);
        component.registerAt(this);
    };

    JBFormComponentsRegistry.prototype.onUnregistration = function(callback){
        this.unregistrationHandlers.push(callback);
    };

    JBFormComponentsRegistry.prototype.unregisterComponent = function(component){
        var index = this.registeredComponents.indexOf(component);
        if(index >= 0) {
            if(!angular.isFunction(component.unregisterAt)){
                //debugger;
                console.warn('JBFormComponentsRegistry: Component %o does not know how to react to unlinking', component);
            } else {
                component.unregisterAt(this);
            }
            this.registeredComponents.splice(index, 1);
            this.unregistrationHandlers.forEach(function(handler){
                handler(component, index);
            });
        }
    };


    JBFormComponentsRegistry.prototype.getSaveCalls = function(){
        return this.registeredComponents.reduce(function(calls, component){
            var subcalls = component.getSaveCalls();
            return calls.concat(subcalls);
        }, []);
    };

    JBFormComponentsRegistry.prototype.isValid = function(){
        for(var i = 0; i < this.registeredComponents.length; i++){
            if(this.registeredComponents[i].isValid() === false) return false;
        }
        return true;
    };

    JBFormComponentsRegistry.prototype.afterSaveTasks = function(id){
        return this.getAfterSaveTasks(id);
    };

    JBFormComponentsRegistry.prototype.getAfterSaveTasks = function(id){
        var calls = this.registeredComponents.reduce(function(subcalls, component){
            if(angular.isFunction(component.afterSaveTasks)){
                return subcalls.concat(component.afterSaveTasks(id));
            }
            return subcalls;
        }, []);
        return this.$q.all(calls).then(function(){
          return id;
        });
    };

    JBFormComponentsRegistry.prototype.beforeSaveTasks = function(entity){
        return this.getBeforeSaveTasks(entity);
    };

    JBFormComponentsRegistry.prototype.getBeforeSaveTasks = function(entity){
        var calls = this.registeredComponents.reduce(function(tasks, component){
            if(angular.isFunction(component.beforeSaveTasks)){
                tasks.push(component.beforeSaveTasks(entity));
            }
            return tasks;
        }, []);
        return this.$q.all(calls).then(function(){
            return entity;
        });
    };

    JBFormComponentsRegistry.prototype.getSelectFields = function () {
        return this.registeredComponents.reduce(function (selects, component) {
            if (angular.isFunction(component.getSelectFields)) return selects.concat(component.getSelectFields());
            if (angular.isDefined(component.select)) return selects.concat(component.select);
            return selects;
        }, []);
    };
    /**
     * @param data
     */
    JBFormComponentsRegistry.prototype.optionsDataHandler = function(data){
        return this.$q.all(this.optionsDataHandlers.map(function(handler){
            return this.$q.when(handler(data));
        }, this)).then(function(){
            return data;
        });
    };

    JBFormComponentsRegistry.prototype.registerOptionsDataHandler = function(handler){
        this.optionsDataHandlers.push(handler);
    };

    JBFormComponentsRegistry.prototype.registerGetDataHandler = function(handler){
        this.getDataHandlers.push(handler);
    };

    JBFormComponentsRegistry.prototype.unregisterGetDataHandler = function(handler){
        this.getDataHandlers.splice(this.getDataHandlers.indexOf(handler), 1);
    };

    JBFormComponentsRegistry.prototype.unregisterOptionsDataHandler = function(handler){
        this.optionsDataHandlers.splice(this.optionsDataHandlers.indexOf(handler), 1);
    };

    JBFormComponentsRegistry.prototype.getDataHandler = function(data){
        console.log('JBFormComponentsRegistry: Send data to %o handlers, are %o', this.getDataHandlers.length, this.getDataHandlers);
        this.getDataHandlers.forEach(function(handler){
            handler(data);
        });
    };
    /**
     * Distributes all the items in the collection after the other to the internal handlers.
     *
     * @note: does not check if there are more handlers than data
     * @param collection
     */
    JBFormComponentsRegistry.prototype.distributeIndexed = function(data){
        return this.distributeIndexedFrom(data, 0);
    };

    JBFormComponentsRegistry.prototype.distributeIndexedFrom = function(data, startIndex){
        for(var i = startIndex; i<this.getDataHandlers.length; i++){
            this.getDataHandlers[i](data, i);
        }
    };

    JBFormComponentsRegistry.prototype.componentAt = function(index){
        return this.registeredComponents[index];
    };

    JBFormComponentsRegistry.prototype.registerYourself = function(scope, stayOnScope){
        var   sourceScope = scope || this.scope
            , targetScope = (stayOnScope === true) ? sourceScope : sourceScope.$parent;

        targetScope.$emit(this.formEvents.registerComponent, this, targetScope);
    };

    JBFormComponentsRegistry.prototype.registerAt = function(parent){
        parent.registerOptionsDataHandler(this.optionsDataHandler.bind(this));
        parent.registerGetDataHandler(this.getDataHandler.bind(this));
    };

    JBFormComponentsRegistry.prototype.unregisterAt = function(parent){
        parent.unregisterOptionsDataHandler(this.optionsDataHandler);
        parent.unregisterGetDataHandler(this.getDataHandler);
    };

    mod.factory(
        'JBFormComponentsService' ,
        [
            '$q' ,
            '$parse',
            'jbFormEvents' ,
            function($q, $parse, formEvents){
                return {
                    registryFor   : function(scope){
                        var registry = new JBFormComponentsRegistry($q, formEvents, scope);
                        return registry;
                    }
                    , registerComponent : function(scope, component, stayOnScope){
                        var targetScope = (stayOnScope === true) ? scope : scope.$parent;
                        targetScope.$emit(formEvents.registerComponent, component, scope);
                    }
                }
            }
        ]);
})();
/**
 * Adds distributed calls to image upload/list component
 */
(function () {

    'use strict';

    var _module = angular.module('jb.formComponents');
        _module.directive('jbFormImageComponent', [function () {

            return {
                  controller: 'jbFormImageComponentController'
                , controllerAs: 'backofficeImageComponent'
                , bindToController: true
                , require: ''
                , link: function (scope, element, attrs, ctrl) {
                    ctrl.init(scope, element, attrs);
                }
                , scope: {
                      'propertyName'    : '@for'
                    , 'pathField'       : '@' // Field that has to be selected to get the image's path, e.g. path or bucket.url
                    , 'imageModel'      : '=model'
                    , 'label'           : '@'
                }
                , template: '' +
                    '<div class="row">' +
                        '<label jb-form-label-component data-label-identifier="{{backofficeImageComponent.label}}" data-is-required="false" data-is-valid="true"></label>' +
                        '<div class="col-md-9 backoffice-image-component" >' +
                            '<div data-file-drop-component data-supported-file-types="[\'image/jpeg\', \'image/png\']" data-model="backofficeImageComponent.images" data-error-handler="backofficeImageComponent.handleDropError(error)">' +
                            '<ol class="clearfix">' +
                                '<li data-ng-repeat="image in backofficeImageComponent.images">' +
                                    '<a href="#" data-ng-click="backofficeImageComponent.openDetailView( $event, image )">' +
                                    // #Todo: Use smaller file
                                        '<img data-ng-attr-src="{{image.url || image.fileData}}"/>' +
                                        '<button type="button" class="remove" data-ng-click="backofficeImageComponent.removeImage($event,image)">&times</button>' +
                                    '</a>' +
                                    '<span class="image-size-info" data-ng-if="!!image.width && !!image.height">{{image.width}}&times;{{image.height}} Pixels</span>' +
                                    '<span class="image-file-size-info" data-ng-if="!!image.fileSize">{{image.fileSize/1000/1000 | number: 1 }} MB</span>' +
                                    '<span class="focal-point-info" data-ng-if="!!image.focalPoint">Focal Point</span>' +
                                '</li>' +
                                '<li><button type="button" class="add-file-button" data-ng-click="backofficeImageComponent.uploadFile()">+</button></li>' +
                            '</ol>' +
                            '<input type="file" multiple/>' +
                        '</div>' +
                    '</div>' +
                '</div>'
            };

        }]);

        _module.controller('jbFormImageComponentController', [
            '$scope'
            , '$rootScope'
            , '$q'
            , '$state'
            , 'APIWrapperService'
            , 'JBFormComponentsService'
            , function ($scope, $rootScope, $q, $state, APIWrapperService, componentsService) {

                var self = this
                    , _element
                    , _detailViewController

                    , _relationKey
                    , _singleRelation

                    , _originalData;

                self.images = [];

                self.init = function (scope, element, attrs, detailViewController) {

                    _element = element;

                    self.ensureSingleImageRelation();

                    componentsService.registerComponent(scope, self);

                };

                self.registerAt = function (parent) {
                    parent.registerOptionsDataHandler(self.updateOptionsData);
                    parent.registerGetDataHandler(self.updateData);
                };

                self.unregisterAt = function (parent) {
                    parent.unregisterOptionsDataHandler(self.updateOptionsData);
                    parent.unregisterGetDataHandler(self.updateData);
                };
                /**
                 * @todo: an image might be required?!
                 */
                self.isValid = function () {
                    return true;
                };

                /**
                 * Make sure only one image can be dropped on a _singleRelation relation
                 */
                self.ensureSingleImageRelation = function () {

                    $scope.$watchCollection(function () {
                        return self.images;
                    }, function () {

                        if (_singleRelation && self.images.length > 1) {
                            // Take last image in array (push is used to add an image)
                            self.images.splice(0, self.images.length - 1);
                        }

                    });

                };


                /**
                 * Called with GET data from detailView
                 */
                self.updateData = function (data) {

                    // Re-set to empty array. Needed if we store something and data is newly loaded: Will just
                    // append and amount of images will grow if we don't reset it to [].
                    self.images = [];

                    // Check if there even is data.
                    if(!data){
                        data = {};
                    }

                    // No image set: use empty array
                    // Don't use !angular.isArray( data.image ); it will create [ undefined ] if there's no data.image.
                    if (!data.image) {
                        data.image = [];
                    }

                    // Image has a hasOne-relation: Is delivered as an object (instead of an array):
                    // Convert to array
                    if (!angular.isArray(data.image)) {
                        data.image = [data.image];
                    }

                    // Store original data (to only send differences to the server when saving)
                    _originalData = data.image.slice();

                    // Create self.images from data.image.
                    data.image.forEach(function (image) {

                        self.images.push(_reformatImageObject(image));

                    });

                };


                /**
                 * Takes data gotten from /image on the server and reformats it for
                 * use in the frontend.
                 */
                function _reformatImageObject(originalObject) {

                    var focalPoint;
                    try {
                        focalPoint = JSON.parse(originalObject.focalPoint);
                    }
                    catch (e) {
                        // Doesn't _really_ matter.
                        console.error('jbFormImageComponentController: Could not parse focalPoint JSON', originalObject.focalPoint);
                    }


                    return {
                        // URL of the image itself
                        url: originalObject[self.pathField]
                        // URL of the entity; needed to crop image
                        , entityUrl: '/image/' + originalObject.id
                        , focalPoint: focalPoint
                        , width: originalObject.width
                        , height: originalObject.height
                        , fileSize: originalObject.size
                        , mimeType: originalObject.mimeType.mimeType
                        , id: originalObject.id // Needed to save the file (see self.getSaveCalls)
                    };

                }

                self.selectSpec = function(data){
                    var   relations = (data && data.relations) ? data.relations : []
                        , imageRelations;

                    if(!relations.length) return;
                    imageRelations = relations.reduce(function(selected, relation){
                        if(relation.remote.resource === 'image'){
                            selected.push(relation);
                        }
                        return selected;
                    }, []);

                    for(var i=0; i<imageRelations.length; i++){
                        var relation = imageRelations[i];
                        if(relation.name === this.propertyName) return relation;
                    }
                };
                /**
                 * Called with OPTIONS data
                 */
                self.updateOptionsData = function (data) {
                    var spec = self.selectSpec(data);

                    if(!spec) return console.error('jbFormImageComponentController: Missing data for %o', self.propertyName);

                    // Relation is 1:n and stored on the entity's id_image field (or similar):
                    // Store relation key (e.g. id_image).
                    // this is the former belongsTo!
                    _singleRelation = spec.type === 'hasOne';
                    if(_singleRelation){
                        _relationKey = spec.property;
                    }
                };


                /**
                 * Returns the fields that need to be selected on the GET call
                 */
                self.getSelectFields = function () {

                    return [self.propertyName + '.*', self.propertyName + '.' + self.pathField, self.propertyName + '.mimeType.*'];

                };


                /**
                 * Store/Delete files that changed.
                 */
                self.getSaveCalls = function () {

                    // Store a signle relation (pretty easy)
                    if (_singleRelation) return _saveSingleRelation();
                    return _saveMultiRelation();
                };

                /**
                 * Saves a single image relation.
                 *
                 * We removed the check involving the the detail view controller to test for the method to choose.
                 * @returns {*}
                 * @private
                 */
                function _saveSingleRelation() {

                    // Removed
                    if (_originalData && _originalData.length && ( !self.images || !self.images.length )) {

                        var data = {};
                        data[_relationKey] = null;
                        return [{ data: data }];
                    }

                    // Added
                    else if ((!_originalData || !_originalData.length) && self.images && self.images.length) {

                        var addData = {};
                        addData[_relationKey] = self.images[0].id;
                        return [{ data: addData }];
                    }

                    // Change: Take the last image. This functionality might (SHOULD!) be improved.
                    else if (_originalData && _originalData.length && self.images && self.images.length && _originalData[0].id !== self.images[self.images.length - 1].id) {

                        var changeData = {};
                        changeData[_relationKey] = self.images[self.images.length - 1].id;
                        return [{ data: changeData }];
                    }

                    else {
                        console.log('jbFormImageComponentController: No changes made to a single relation image');
                        return [];
                    }

                }


                function _saveMultiRelation() {
                    // Calls to be returned
                    var calls = []

                    // IDs of images present on init
                        , originalIds = []

                    // IDs of images present on save
                        , imageIds = [];


                    if (_originalData && angular.isArray(_originalData)) {
                        _originalData.forEach(function (img) {
                            originalIds.push(img.id);
                        });
                    }


                    self.images.forEach(function (img) {
                        imageIds.push(img.id);
                    });


                    // Deleted
                    originalIds.forEach(function (id) {
                        if (imageIds.indexOf(id) === -1) {

                            // Original image seems to be automatically deleted when the relation is removed.
                            // Remove image iself (try to; not the relation)
                            calls.push({
                                method: 'DELETE'
                                , url: '/image/' + id
                            });

                        }
                    });

                    // Added
                    imageIds.forEach(function (id) {
                        if (originalIds.indexOf(id) === -1) {
                            calls.push({
                                method: 'POST'
                                , url: 'image/' + id
                            });
                        }
                    });

                    console.log('jbFormImageComponentController: Calls to be made are %o', calls);
                    return calls;


                }


                /**
                 * Upload all image files
                 */
                self.beforeSaveTasks = function () {

                    var requests = [];

                    // Upload all added files (if there are any), then resolve promise
                    self.images.forEach(function (image) {

                        // Only files added per drag and drop have a file property that's an instance of File
                        // (see file-drop-component)
                        if (image.file && image.file instanceof File) {

                            console.log('jbFormImageComponentController: New file %o', image);
                            // Errors will be handled in detail-view
                            requests.push(_uploadFile(image));

                        }

                    });

                    console.log('jbFormImageComponentController: Upload %o', requests);

                    return $q.all(requests);

                };


                /**
                 * Uploads a single file.
                 * @param {Object} file        Object returned by drop-component. Needs to contain a file property containing a File type.
                 */
                function _uploadFile(image) {

                    console.log('jbFormImageComponentController: Upload file %o to /image through a POST request', image);

                    return APIWrapperService.request({
                        method: 'POST'
                        , data: {
                            image: image.file
                        }
                        , url: '/image'
                    })

                        .then(function (data) {
                            // Store data gotten from server on self.images[ i ] )
                            // instead of the image File object
                            var index = self.images.indexOf(image);
                            var newFileObject = _reformatImageObject(data);

                            self.images.splice(index, 1, newFileObject);
                            console.log('jbFormImageComponentController: Image uploaded, replace %o with %o', self.images[index], newFileObject);

                            return data;

                        });

                }


                /**
                 * Click on remove icon on image.
                 */
                self.removeImage = function (ev, image) {

                    ev.preventDefault();
                    self.images.splice(self.images.indexOf(image), 1);

                };


                /**
                 * Click on image
                 */
                self.openDetailView = function (ev, image) {

                    ev.preventDefault();

                    // Image wasn't stored yet: There's no detail view.
                    if (!image.id) {
                        return;
                    }

                    $state.go('app.detail', {entityName: 'image', entityId: image.id});

                };


                /**
                 * Called from within file-drop-component
                 */
                self.handleDropError = function (err) {

                    $scope.$apply(function () {
                        $rootScope.$broadcast('notification', {
                            'type': 'error'
                            , 'message': 'web.backoffice.detail.imageDropError'
                            , 'variables': {
                                'errorMessage': err
                            }
                        });
                    });

                };


                ////////////////

                self.uploadFile = function () {

                    _element
                        .find('input[type=\'file\']')
                        .click();

                };


            }]);

})();


/**
* Component for a single image to
* - set focal points
*/
( function(undefined) {

	'use strict';

	var _module = angular.module( 'jb.formComponents' );

	/**
	* <input data-backoffice-image-component 
	*	data-for="enity">
	*/
	_module.directive( 'jbFormImageDetailComponent', [ function() {

		return {
			  controller		: 'JBFormImageDetailComponentController'
			, controllerAs		: 'backofficeImageDetailComponent'
			, bindToController	: true
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl.init(scope, element, attrs);
			}
			, template :
            '<label data-backoffice-label data-label-identifier="{{backofficeImageDetailComponent.label}}" data-is-required="false" data-is-valid="true"></label>' +
			'<div class="col-md-9 backoffice-image-detail-component">' +
			    '<div class="image-container">' +
			        '<img data-ng-attr-src="{{backofficeImageDetailComponent.image[ backofficeImageDetailComponent.pathField ]}}" data-ng-click="backofficeImageDetailComponent.setFocalPointClickHandler($event)"/>' +
			        '<div class="focal-point-indicator" data-ng-if="backofficeImageDetailComponent.getFocalPoint()" data-ng-attr-style="top:{{backofficeImageDetailComponent.getFocalPointInPercent().y}}%;left:{{backofficeImageDetailComponent.getFocalPointInPercent().x}}%"></div>' +
                '</div>' +
                '<div data-ng-if="!backofficeImageDetailComponent.getFocalPoint()">{{ "web.backoffice.image.focalPointNotSet" | translate }}</div>' +
			    '<div data-ng-if="backofficeImageDetailComponent.getFocalPoint()">{{ "web.backoffice.image.focalPoint" | translate }}: {{ backofficeImageDetailComponent.getFocalPoint().x }} / {{backofficeImageDetailComponent.getFocalPoint().y}} </div>' +
			'</div>'
			, scope: {
                  pathField : '@'
                , label     : '@'
			}

		};

	} ] );

	_module.controller( 'JBFormImageDetailComponentController', [
          '$scope'
        , 'JBFormComponentsService'
        , function( $scope, componentsService) {

		var self = this
			, _element
			, _detailViewController

			//, _imageRenderingIds = []
			, _originalFocalPoint;


		self.image = {};


		self.init = function( scope, element, attrs ) {
            componentsService.registerComponent(scope, self);
		};

		self.isValid = function(){
			return true;
		};

        self.registerAt = function(parent){
            parent.registerGetDataHandler( self.updateData );
        };

			self.unregisterAt = function(parent){
				parent.unregisterGetDataHandler( self.updateData );
			};

		self.updateData = function( data ) {

			self.image = data;

			// Convert focalPoint to object, but only if it has a x and y property
			if( data.focalPoint ) {
				try {
					var focalPoint = JSON.parse( data.focalPoint );
					if( focalPoint.x && focalPoint.y ) {

						focalPoint.x = parseInt( focalPoint.x, 10 );
						focalPoint.y = parseInt( focalPoint.y, 10 );

						if( isNaN( focalPoint.x ) || isNaN( focalPoint.y ) ) {
							throw new Error( 'x or y property on focalPoint not an integer (or castable).' );
						}

						self.image.focalPoint = focalPoint;
					}
					else {
						throw new Error( 'Property x or y missing on ' + data.focalPoint );
					}
				}
				catch( e ) {
					console.error( 'JBFormImageDetailComponentController: Could not parse focalPoint ' + data.focalPoint + ': ' + e.message );
				}
			}
			_originalFocalPoint = angular.copy( data.focalPoint );

		};


		/**
		* Implies that path is /image/imageId
		*/
		self.getSelectFields = function() {

			// imageRendering: Renderings must be deleted when changing the focal point. 
			// See https://github.com/joinbox/eb-backoffice/issues/112
			return '*,mimeType.*,' + self.pathField;

		};

		self.getSaveCalls = function() {
			
			// Not set before and after (but not identical due to angular.copy)
			if( !_originalFocalPoint && !self.image.focalPoint ) {
				return [];
			}

			// Same x and y property
			var sameX		= _originalFocalPoint && self.image.focalPoint && _originalFocalPoint.x && self.image.focalPoint.x && self.image.focalPoint.x === _originalFocalPoint.x
				, sameY		= _originalFocalPoint && self.image.focalPoint && _originalFocalPoint.y && self.image.focalPoint.y && self.image.focalPoint.y === _originalFocalPoint.y;
			
			if( sameX && sameY ) {
				return false;
			}

			var calls = [];

			// PATCH on image automatically deletes imageRenderings. No need to do it manually.
			calls.push( {
				// It's always PATCH, as the image does exist
				  method	    : 'PATCH'
				, url			: ''
				, data			: {
					focalPoint	: JSON.stringify( self.image.focalPoint )
				}
			} );

			return calls;

		};




		/**
		* Click handler
		*/
		self.setFocalPointClickHandler = function( ev ) {
				
			var newFocalPoint = {
				x		: Math.round( ev.offsetX / ev.target.width * self.image.width )
				, y		: Math.round( ev.offsetY / ev.target.height * self.image.height )
			};
			console.log( 'JBFormImageDetailComponentController: Set focal point to ', JSON.stringify( newFocalPoint ) );

			self.image.focalPoint = newFocalPoint;

		};




		/**
		* Returns focalPoint as object with properties x and y – or false. 
		*/ 
		self.getFocalPoint = function() {
			
			if( !self.image || !self.image.focalPoint ) {
				return false;
			}

			return self.image.focalPoint;

		};



		/**
		* Returns % values of focal point. Needed for indicator.
		*/
		self.getFocalPointInPercent = function() {
			var focalPoint = self.getFocalPoint();

			if( !focalPoint ) {
				return false;
			}

			return {
				x		: Math.round( focalPoint.x / self.image.width * 100 )
				, y		: Math.round( focalPoint.y / self.image.height * 100 )
			};

		};

	} ] );


} )();


(function (undefined) {
    "use strict";

    var _module = angular.module('jb.formComponents');

    _module.controller('jbFormLabelController', ['$scope', function ($scope) {
        this.$scope = $scope;
    }]);

    _module.directive('jbFormLabelComponent', ['$templateCache', '$compile', function ($templateCache, $compile) {
        return {
            link: function ($scope, element, attrs, ctrl) {
                var tpl = angular.element($templateCache.get('backofficeLabelTemplate.html'));
                element.replaceWith(tpl);
                $compile(tpl)($scope);
            }
            , scope: {
                  labelIdentifier: '@'
                , isRequired: '&'
                , isValid: '&'
            }
        };
    }]);

    _module.run(function ($templateCache) {
            $templateCache.put('backofficeLabelTemplate.html',
                '<div class="col-md-3">' +
                    '<label class="control-label" data-ng-class="{invalid: !isValid()}">' +
                        '<span data-ng-if="isRequired()||required" class="required-indicator">*</span>' +
                        '<span data-translate="{{labelIdentifier}}"></span>' +
                    '</label>' +
                '</div>'
            );
        });
})();
(function(undefined){
    "use strict";
    /**
     * @todo: This directive needs some refactoring!
     */
    var _module = angular.module('jb.formComponents');

    _module.directive('jbFormLocaleComponent', function(){
        return {
              controller        : 'JBFormLocaleComponentController'
            , controllerAs      : '$ctrl'
            , bindToController  : true
            , scope: {
                  fieldsExclude : '<'
                , languageOrder : '<'
                , fieldOrder    : '<'
                , entityName    : '@entity'
                , relationName  : '@relation'
                , isReadonly    : '<'
            }
            , template: '<div class="locale-component container">' +
                            '<!-- LOCALE-COMPONENT: way too many divs in here -->'+
                            '<div class="row">' +
                                '<div class="col-md-12">' +
                                    '<ul class="nav nav-tabs col-md-12">' +
                                        '<li ng-repeat="language in $ctrl.getSupportedLanguages()" ng-class="{active:$ctrl.isSelected(language)}">'+
                                            '<a href="#" ng-click="$ctrl.toggleLanguage($event, language)">'+
                                                '{{language.code|uppercase}}' +
                                                '<span data-ng-if="$ctrl.checkForTranslation(language)" class="fa fa-check"></span>' +
                                            '</a>'+
                                        '</li>'+
                                    '</ul>'+
                                '</div>'+
                            '</div>' +
                            '<div class="locale-content">' +
                                '<div class="locale-col" ng-repeat="language in $ctrl.selectedLanguages">' +
                                    '<p>{{ language.code | uppercase }}</p>' +
                                    '<ul ng-if="$ctrl.fieldDefinitions">' +
                                        '<li ng-repeat="fieldName in $ctrl.fields">' +
                                            '<label ng-attr-for="locale-{{language.code}}-{{fieldName}}" ng-class="{ \'invalid\' : !$ctrl.fieldIsValid($ctrl.locales[ language.id ], fieldName)}">' +
                                                '<span data-translate="web.backoffice.{{$ctrl.entityName}}.{{fieldName}}"></span>' +
                                                '<span class="required-indicator" data-ng-show="fieldDefinitions[fieldName].required">*</span>' +
                                            '</label>' +
                                            '<textarea ng-model="$ctrl.locales[ language.id ][ fieldName ]" ' +
                                                'ng-attr-id="locale-{{language.code}}-{{fieldName}}"' +
                                                'class="form-control" ' +
                                                'ng-disabled="$ctrl.isReadonly"' +
                                                'ng-keyup="$ctrl.adjustHeight( $event )" ' +
                                                'ng-click="$ctrl.adjustHeight( $event )" />' +
                                            '</textarea>' +
                                        '</li>'+
                                    '</ul>' +
                                '</div>' +
                            '</div>' +
                        '</div>'

            , link: {
                pre: function(scope, element, attrs, ctrl){
                    ctrl.preLink(scope, element, attrs);
                }
                , post: function(scope, element, attrs, ctrl){
                    ctrl.postLink(scope, element, attrs);
                }
            }
        };
    });
    /**
     * @todo: remove unnecessary fuzz
     * @todo: remove the dependency to the session service and add a provider
     * @param $scope
     * @param $q
     * @param $timeout
     * @param api
     * @param componentsService
     * @param sessionService
     * @constructor
     */
    function JBFormLocaleComponentController($scope, $q, $timeout, api, componentsService, sessionService, boAPIWrapper){
        this.$scope             = $scope;
        this.api                = api;
        this.$q                 = $q;
        this.$timeout           = $timeout;
        this.componentsService  = componentsService;
        this.options            = null;
        this.fieldDefinitions   = null;
        // All fields that will be displayed in the fieldOrder provided
        this.fields             = [];
        this.locales            = [];
        this.originalLocales    = [];
        this.heightElement      = null;
        this.heightElementInitialized = false;
        this.boAPI              = boAPIWrapper;
        this.supportedLanguages = (sessionService.get('supported-languages', 'local') || []).map(function(item, index){
            var lang = angular.copy(item.language);
            lang.selected = false;
            return lang;
        }, this).sort(function(a, b) {
            if (!this.languageOrder || !this.languageOrder.length || !this.languageOrder[a.code] || !this.languageOrder[b.code]) return 0;
            return this.languageOrder[a.code] < this.languageOrder[b.code] ? -1 : 1;
        }.bind(this));
        this.element = null;
    }

    JBFormLocaleComponentController.prototype.preLink = function(){};
    JBFormLocaleComponentController.prototype.postLink = function(scope, element, attrs){
        this.componentsService.registerComponent(scope, this);
        this.heightElement = angular.element('<div></div>');
        this.heightElement = this.heightElement.attr('id', 'locale-height-container');
        this.heightElement.css('position', 'absolute');
        this.heightElement.css('left', '-9999px');
        this.heightElement.css('top', '-9999px');
        this.element = element;
        this.element.append(this.heightElement);
    };

    JBFormLocaleComponentController.prototype.registerAt = function(parent){
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
        parent.registerGetDataHandler(this.handleGetData.bind(this));
    };

    JBFormLocaleComponentController.prototype.unregisterAt = function(parent){
        parent.unregisterOptionsDataHandler(this.handleOptionsData);
        parent.unregisterGetDataHandler(this.handleGetData);
    };

    JBFormLocaleComponentController.prototype.getSelectedLanguages = function(){
        var selected = [];
        for(var i=0; i<this.supportedLanguages.length; i++){
            var lang = this.supportedLanguages[i];
            if(lang.selected === true) selected.push(lang);
        }
        return selected;
    };

    JBFormLocaleComponentController.prototype.getSupportedLanguages = function(){
        return this.supportedLanguages;
    };

    JBFormLocaleComponentController.prototype.fieldIsValid = function(locale, property){

        var   definition = this.fieldDefinitions[property];
        // fields of locales which do not yet exist are not validated
        if(!locale) return true;
        if(definition.required === true) return !this._localePropertyIsEmpty(locale[property]);
        return true;
    };

    JBFormLocaleComponentController.prototype.adjustHeight = function(event){
        var   element       = angular.element(event.currentTarget);
        this.adjustElementHeight(element);
    };

    JBFormLocaleComponentController.prototype.adjustElementHeight = function(element){

        var   scrollHeight  = element[0].scrollHeight
            , textValue     = element.val()
            , targetWidth;


        if(!this.heightElementInitialized) this.initializeHeightElement(element);

        // remove the scrollbar
        element.height(scrollHeight);
        // measure the width after the scrollbar has gone
        targetWidth = element.width();
        // set the corresponding width to the height measuring container
        this.heightElement.width(targetWidth);
        // sanitize newlines so they are correctly displayed in the height element
        textValue = textValue.replace(/(\n\r?)/g, '<br>').replace(/(\<br\>\s*)$/, '<br><br>');
        // adds the content or a placeholder text (to preserve the basic height)
        if(textValue.trim() == '') textValue = 'empty';
        // insert the content as html to be sure linebreaks are rendered correctly
        this.heightElement.html(textValue);
        // set the width
        this.heightElement.width(targetWidth);
        // port the height of the element
        element.height(this.heightElement.height());
    };

    JBFormLocaleComponentController.prototype.adjustAllHeights = function(){
        this.element.find('textarea').each(function(index, element){
            this.adjustElementHeight(angular.element(element));
        }.bind(this));
    };

    JBFormLocaleComponentController.prototype.initializeHeightElement = function(element){

        [     'font-size'
            , 'font-family'
            , 'font-weight'
            , 'letter-spacing'
            , 'line-height'
            , 'padding-top'
            , 'padding-left'
            , 'padding-right'
            , 'padding-bottom'
            , 'border-radius'
            , 'border'].forEach(function(property){
                this.heightElement.css(property, element.css(property));
            }, this);
        this.heightElement.css('word-wrap', 'break-word');
        this.heightElementInitialized = true;
    };

    JBFormLocaleComponentController.prototype.toggleLanguage = function(event, language){
        if(event) event.preventDefault();
        var langs = this.getSelectedLanguages();
        if(language){
            if(language.selected && langs.length == 1) return;
            language.selected = language.selected !== true;
        }
        this.reassignLanguages().then(this.adjustAllHeights.bind(this));
    };

    JBFormLocaleComponentController.prototype.reassignLanguages = function(){
        this.selectedLanguages = this.getSelectedLanguages();
        return this.$timeout();
    };

    JBFormLocaleComponentController.prototype.isSelected = function(language){
        return language.selected === true;
    };

    JBFormLocaleComponentController.prototype.checkForTranslation = function(language){
        return !!(this.locales && angular.isDefined( this.locales[language.id] ));
    };

    JBFormLocaleComponentController.prototype.translationIsEmpty = function(data){
        return this.fields.reduce(function(previous, field){
            return previous && !data[field] && data[field].trim() !== '';
        }, true);
    };

    JBFormLocaleComponentController.prototype.selectSpec = function(data){
        var relations = (data && data.relations) ? data.relations : [];
        if(!relations.length) return;
        for(var i = 0; i<relations.length; i++){
            var current = relations[i]
            if(current.type !== 'hasManyAndBelongsToMany') continue;
            if(this.entityName === current.remote.resource) return current;
            if(this.relationName === current.name) return current;
        }
    };
    /**
     * Takes the options data passed by the containing component, and sets up the corresponding fieldDefinitions which
     * are necessary to validate the contained fields.
     *
     * @note: In the select call we need to set the related table name and select all fields plus the languages. Currently
     * we are not able to properly identify locales.
     *
     * In some situations, it seems like the update of the field defintions is not propagated properly to the view.
     * Therefore it is necessary to toggle the languages again!
     * @todo: trigger error state
     */
    JBFormLocaleComponentController.prototype.handleOptionsData = function(data){
        var spec = this.selectSpec(data);
        if(!spec) return console.error('No OPTIONS data found in locale component.');

        this.options    = spec;
        return this.loadFields()
                    .then(function(fields){
                            this.fieldDefinitions = this.filterFields(fields);
                            var fieldNames = Object.keys(this.fieldDefinitions);
                            this.fields = this.sortFields(fieldNames);
                            return this.ensureLanguageIsSelected();
                        }.bind(this)
                    , function(error){
                        console.error(error);
                    });
    };

    /**
     * @todo: find a proper way to resolve the endpoint!!
     * @returns {*}
     */
    JBFormLocaleComponentController.prototype.loadFields = function(){
        var url = '/' + this.getLocaleProperty();
        // The options call is now cached in the api
        //if(this.fieldDefinitions) return this.$q.when(this.fieldDefinitions);
        return this.api.getOptions(url).then(function(fields){
            return fields.properties;
        }.bind(this), function(error){
            console.error(error);
        });
    };

    JBFormLocaleComponentController.prototype.sortFields = function(fields){

        // Check if order is available; if not, don't sort
        if (!this.fieldOrder || !this.fieldOrder.length) return fields;

        var sortedFields = []
            , unsortedIndex = this.fieldOrder.length;

        fields.forEach(function(field) {
            var index = this.fieldOrder.indexOf(field) > -1 ? this.fieldOrder.indexOf(field) : unsortedIndex++;
            sortedFields[index] = field;
        }.bind(this));
    
        return sortedFields;

    };

    JBFormLocaleComponentController.prototype.filterFields = function(fields){
        if(!fields) return {};
        return fields.reduce(function(sanitizedFields, field){
            if((!this.fieldsExclude || this.fieldsExclude.indexOf(field.name) == -1) && field.isPrimary !== true){
                sanitizedFields[field.name] = field;
            }
            return sanitizedFields;
        }.bind(this), {});
    };

    JBFormLocaleComponentController.prototype._localeIsEmpty = function(locale){
        return this.fields.every(function(fieldName){
            return this._localePropertyIsEmpty(locale[fieldName]);
        }, this);
    };

    JBFormLocaleComponentController.prototype._localePropertyIsEmpty = function(value){
        return angular.isUndefined(value) || value.trim() == '';
    };

    JBFormLocaleComponentController.prototype._localeGetChanges = function(locale, originalLocale){
        // the locale is new
        if(!angular.isDefined(originalLocale)){
            // the locale has no data, meaning that there are no changes
            if(this._localeIsEmpty(locale)){
                return [];
            }
            // otherwise all fields are new
            return this.fields;
        }

        // collect all fields which do not hold the same value
        return this.fields.reduce(function(changedFields, fieldName){
            if(locale[fieldName] != originalLocale[fieldName]){
                changedFields.push(fieldName);
            }
            return changedFields;
        }.bind(this), []);
    };

    /**
     * We could also adjust the _localeGetChanges method to be able to deal with locales that were not created.
     */
    JBFormLocaleComponentController.prototype.getSaveCalls = function(){

        var   calls     = [];

        if(this.isReadonly) return calls;

        this.locales.forEach(function(locale, id){

            var   originalLocale    = this.originalLocales[id]
                , localeExisted     = angular.isDefined(originalLocale);

            // Locale exists (means it was created by the angular binding or was already present)
            if(locale) {
                var   changes = this._localeGetChanges(locale, originalLocale)
                    , method  = (localeExisted) ? 'PATCH' : 'POST';
                // There are changes
                if(changes.length > 0) {
                    var call = {};
                    call.data = changes.reduce(function(entity, field){
                            entity[field] = locale[field];
                            return entity;
                    }, {});

                    call.url            = {};
                    call.url.path       = 'language/'+id;
                    call.url.mainEntity = 'prepend';

                    call.method = method;
                    calls.push(call);
                }
            }
        }, this);
        return calls;
    };
    /**
     * Returns the name of the property we need to select the localization table on the base entity.
     */
    JBFormLocaleComponentController.prototype.getLocaleProperty = function(){
        return this.options.via.resource;
    };

    JBFormLocaleComponentController.prototype.handleGetData = function(data){
        var locales             = (data) ? data[this.getLocaleProperty()] : data;
        if(locales){
            this.originalLocales    = this.normalizeModel(locales);
            this.locales            = angular.copy(this.originalLocales);
        }
        this.ensureLanguageIsSelected().then(this.adjustAllHeights.bind(this));
    };

    JBFormLocaleComponentController.prototype.ensureLanguageIsSelected = function(){
        if(!this.selectedLanguages) this.selectedLanguages = [];
        if(this.selectedLanguages.length === 0) {
            return this.toggleLanguage(null, this.supportedLanguages[0]);
        }
        return this.$timeout();
    };

    JBFormLocaleComponentController.prototype.getFields = function(){
        if(!this.fieldDefinitions) return [];
        return this.fields.map(function(fieldName){
            return this.fieldDefinitions[fieldName];
        }, this);
    };

    JBFormLocaleComponentController.prototype.normalizeModel = function(data){
        return data.reduce(function(map, item){
            map[item.language.id] = item;
            return map;
        }, []);
    };

    JBFormLocaleComponentController.prototype.getLocales = function(){
        return this.locales;
    };
    /**
     * @todo: Load all fields and then eliminate primary and foreign keys. In this case we don't need to release the
     * backoffice if the table is extended with new locales.
     *
     * @returns {*}
     */
    JBFormLocaleComponentController.prototype.getSelectFields = function(){

        var   localeTableName   = this.getLocaleProperty()
            , languageSelector  = [localeTableName, 'language', '*'].join('.')
            , selects           = [];

        /*selects =  this.fields.map(function(field){default
            return [localeTableName, field].join('.');
        }, this);*/
        selects.push([localeTableName, '*'].join('.'));
        selects.push(languageSelector);
        return selects;
    };

    /**
     * @todo: use the registration system to detect all the input fields and let them validate themselves?
     */
    JBFormLocaleComponentController.prototype.isValid = function(){
        if(this.isReadonly) return true;
        return this.locales.reduce(function(localeValidity, locale, index){
            if(angular.isUndefined(locale)) return localeValidity;
            if(angular.isUndefined(this.originalLocales[index]) && this._localeIsEmpty(locale)) return localeValidity;
            return localeValidity && this.fields.reduce(function(fieldValidity, fieldName){
                    return fieldValidity && this.fieldIsValid(locale, fieldName);
            }.bind(this), true);
        }.bind(this), true);
    };

    _module.controller('JBFormLocaleComponentController', [
          '$scope'
        , '$q'
        , '$timeout'
        , 'APIWrapperService'
        , 'JBFormComponentsService'
        , 'SessionService'
        , 'BackofficeAPIWrapperService'
        , JBFormLocaleComponentController
    ]);
})();
/**
 * New reference component.
 *
 * The relation input forces us to set the entity url during the rendering of the template, which means we have to postpone
 * the rendering and recompile as soon as we
 */
(function (undefined) {

	/* global angular */

	'use strict';

	var _module = angular.module('jb.formComponents');
	/*
	 Get these fuckers from the options call.

	 , deletable             : '<?relationIsDeletable'
	 , creatable             : '<?relationIsCreatable' */

	function createBaseDirective(controller){
		return function() {
			return {
				  controller        : controller
				, controllerAs      : '$ctrl'
				, bindToController  : true
				, link: {
					pre: function (scope, element, attrs, ctrl) {
						ctrl.preLink(scope, element, attrs);
					}
					, post: function (scope, element, attrs, ctrl) {
						ctrl.hasLabel = attrs.hasOwnProperty('label');
						ctrl.hasModel = attrs.hasOwnProperty('relationInputModel');
						ctrl.enableFulltext = attrs.hasOwnProperty('relationEnableFulltextSearch');
						ctrl.postLink(scope, element, attrs);
					}
				}
				, scope: {
					  'propertyName'    : '@for'
					, 'entityName'      : '@entity'
					, 'relationName'    : '@relation'
					/**
					* Must be a filter, e.g. identifier='event'. First match will be taken.
					*/
					, 'defaultValue'    : '@'

					/**
					* Service name, if available. Used to prefix url (e.g. shop.inventory)
					*/
					, 'serviceName'		: '@'

					, 'label'           : '@?'
					, 'showLabel'		: '<?'

					, 'suggestion'      : '@suggestionTemplate'
					, 'searchField'     : '@'
					, 'changeHandler'   : '&'
					, 'filters'         : '<'

					, 'isInteractive'		: '<?relationIsInteractive'
					, 'disableRemoveButton'	: '<?relationDisableRemoveButton'
					, 'disableNewButton'	: '<?relationDisableNewButton'
					, 'disableEditButton'   : '<?relationDisableEditButton'
					, 'model'               : '=?relationModel'

					, 'isReadonly'          : '<?relationIsReadonly'
					, 'enableFulltextSearch': '<?relationEnableFulltextSearch'

					, 'resultCount'         : '<?relationResultCount'
				}
			};
		};
	}

	_module.directive('jbFormReferenceComponent' , [createBaseDirective('JBFormReferenceController')]);
	_module.directive('jbFormRelationComponent'  , [createBaseDirective('JBFormRelationController')]);

	/**
	 * Controller which handles the reference to an entity. Currently used as super-controller, but we should change that.
	 *
	 * @param $scope
	 * @param $attrs
	 * @param $compile
	 * @param $templateCache
	 * @param componentsService
	 * @param relationService
	 * @constructor
	 */
	function JBFormReferenceController($scope, $attrs, $compile, $templateCache, componentsService, relationService, apiWrapper) {

		this.subcomponentsService   = componentsService;
		this.options                = null;
		this.originalData           = [];
		this.suggestion             = '';
		this.relationService        = relationService;
		this.$scope                 = $scope;
		this.$compile               = $compile;
		this.$templateCache         = $templateCache;
		this.element                = null;
		this.currentData            = [];
		this.referencedPropertyName = null;
		this.relationTypes          = ['hasOne'];
		this.rendered               = false;
		this.isWatchingForCallback  = false;
		this.isMultiSelect          = false;
		this.parentOptions          = null;
		this._api 					= apiWrapper;

		// Watch changes of defaultValue; get data on change.
		// Also watch changes of relationName as relationName must be set before we can create the 
		// needed fake object (see getDefaultValue())
		$scope.$watch(function() { return this.defaultValue; }.bind(this), function() {
			if (!this.defaultValue) return;
			this.getDefaultValue();
		}.bind(this));

	}

	JBFormReferenceController.prototype.preLink = function () {};

	JBFormReferenceController.prototype.postLink = function (scope, element) {
		if(angular.isUndefined(this.showLabel)) this.showLabel = true;
		this.subcomponentsService.registerComponent(scope, this);
		this.element = element;
	};


	JBFormReferenceController.prototype.getEntityUrl = function() {
		var url = (this.serviceName ? this.serviceName + '.' : '');
		url += this.entityName;
		console.log('JBFormReferenceController: url is %o', url);
		return url;
	};


	/**
	* Request default value, if set. Then call getDataHandler – but only if it isn't set.
	*/
	JBFormReferenceController.prototype.getDefaultValue = function() {

		// Real data is available: Don't event request the default.
		if (this.currentData && this.currentData.length) return;

		var self = this;
		console.log('JBFormReferenceController: Get default value from entity %o, filter %o', self.entityName, self.defaultValue);

		return this._api.request({
				url			: self.entityName
				, headers	: {
					filter	: self.defaultValue
				}
			})
			.then(function(result) {

				if (!result || !result.length) {
					console.log('JBFormReferenceController: Could not get default value for entity %o, filter %o', self.entityName, self.defaultValue);
					return;
				}

				// Real data is available.
				if (self.currentData && self.currentData.length) return;

				// Update model
				console.log('JBFormReferenceController: Update model with default value %o', result);

				// defaultValueData will be handled in this.handleGetData if it has not yet been
				// called
				self.defaultValueData = result;

				// handleGetData was already called (sets isWatchingForCallback)
				// Update currentData as changes are being watched
				if (self.isWatchingForCallback) {
					this.currentData = this.defaultValueData;
				}

			});

	};








	JBFormReferenceController.prototype.displayLabel = function(){
		return this.hasLabel && this.showLabel !== false;
	};

	JBFormReferenceController.prototype.registerAt = function (parent) {
		parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
		parent.registerGetDataHandler(this.handleGetData.bind(this));
	};

	JBFormReferenceController.prototype.unregisterAt = function (parent) {
		parent.unregisterOptionsDataHandler(this.handleOptionsData);
		parent.unregisterGetDataHandler(this.handleGetData);
	};

	/*JBFormReferenceController.prototype.getEndpoint = function () {
		return this.entityName;
	};*/

	// @todo: catch it if the options are not found
	// @todo: make this method abstract and implement it for the reference as well as the relation

	JBFormReferenceController.prototype.handleGetData = function (data) {

		// If data is empty, don't update currentData. Needed especially for defaultValue: 
		// We don't want to update the defaultValue with [] if data is empty.
		// Dummy data (see jub-form-view or ask @Rüfe)
		var isEmptyData = data.isDummy;
		// Non-value
		isEmptyData = isEmptyData || !data || !data[this.relationName];
		// Empty array
		isEmptyData = isEmptyData || (Array.isArray(data[this.relationName]) && !data[this.relationName].length);


		this.currentData = [];

		if (!isEmptyData) {
			var selectedData = data[this.relationName];
			if(!angular.isArray(selectedData)){
				selectedData = [selectedData];
			}
			this.currentData = selectedData;
		}
	
		this.originalData = angular.copy(this.currentData);


		// GET data is empty, but default is present (set *after* originalData was stored as it represents
		// a change!)
		if (isEmptyData && this.defaultValueData) this.currentData = this.defaultValueData;


		if(!this.isWatchingForCallback){
			this.$scope.$watch(
				  function(){ return this.currentData; }.bind(this)
				, function(newValue, oldValue){
					if(this.changeHandler) this.changeHandler({ newValue: newValue , oldValue: oldValue });
				}.bind(this));
			this.isWatchingForCallback = true;
		}
		console.log('BackofficeReferenceComponentController: Model updated (updateData) to %o', this.currentData);
	

	};

	// @todo: make this method abstract and implement it for reference as well as relation
	JBFormReferenceController.prototype.getSpec = function(data){

		var   relations = (data && data.relations) ? data.relations : []
			, relation;

		if(!relations.length) return;

		for(var i=0; i<relations.length; i++){
			relation = relations[i];
			if(this.relationTypes.indexOf(relation.type) === -1)                continue;
			if(relation.property && this.propertyName === relation.property)    return relation;
			if(relation.name && this.relationName === relation.name)            return relation;
			if(relation.remote.resource && this.entityName === relation.name)   return relation;
		}

		return;
	};

	JBFormReferenceController.prototype.handleOptionsData = function (data) {
		if(this.rendered === true) return;

		var   fieldSpec    = this.getSpec(data);

		if (!angular.isDefined(fieldSpec)) {
			return console.error(
				'JBFormRelationComponent: No options data found for name %o referencing entity %o or relation %o in data %o.'
				, this.propertyName
				, this.entityName
				, this.relationName
				, data);
		}
		this.parentOptions = data;
		if(this.adaptToSpec(fieldSpec)) {
			return this.renderComponent();
		}
	};

	JBFormReferenceController.prototype.adaptToSpec = function(fieldSpec) {
		this.propertyName           = fieldSpec.property;
		this.entityName             = fieldSpec.remote.resource;
		this.relationName           = fieldSpec.name;
		this.referencedPropertyName = fieldSpec.remote.property;
		this.options                = fieldSpec;

		return true;
	};

	/**
	 * Renders the current directive by modifying the template and recompiling the content of the current component.
	 *
	 * This is a rather hacky way of injecting the content but sadly the 'relation-input' directive does not properly
	 * access/evaluate all of its parameters and therefore not all values are correctly interpreted if inserted using
	 * bindings within the template.
	 */
	JBFormReferenceController.prototype.renderComponent = function(){
		// This happens synchronously, and is therefore not a problem
		var template = angular.element(this.$templateCache.get('referenceComponentTemplate.html'));
		this.$compile( template )( this.$scope );
		this.element.prepend( template );
		this.rendered = true;
	};

	JBFormReferenceController.prototype.addModelTransformations = function(template){
		return template.attr('sanitize-model', true);
	};

	JBFormReferenceController.prototype.isInteractive = function(){
		console.info(this.interactive);
		return angular.isDefined(this.interactive) ? this.interactive : true;
	};

	JBFormReferenceController.prototype.isDeletable = function(){
		return this.options && !this.isRequired() && this.options.permissions && this.options.permissions.deleteRelation === true;
	};

	JBFormReferenceController.prototype.isCreatable = function(){
		return this.options && this.options.permissions && this.options.permissions.createRelation === true;
	};

	JBFormReferenceController.prototype.getLabel = function () {
		if (this.label) return this.label;
		return this.propertyName;
	};

	JBFormReferenceController.prototype.getSelectFields = function () {
		var   selectFields   = this.relationService.extractSelectFields(this.getSuggestionTemplate())
			, prefixedFields;

		prefixedFields = selectFields.map(function (field) {
			return [this.relationName, field].join('.');
		}, this);

		if(this.propertyName) prefixedFields.unshift(this.propertyName);

		return prefixedFields;
	};

	JBFormReferenceController.prototype.isRequired = function () {
		if (!this.options) return true;
		return this.options.nullable === true;
	};

	JBFormReferenceController.prototype.getSuggestionTemplate = function () {
		return this.suggestion;
	};

	JBFormReferenceController.prototype.getSearchField = function(){
		return this.searchField;
	};

	JBFormReferenceController.prototype.isValid = function(){
		if(this.isRequired()) return this.currentData.length > 0;
		return true;
	};

	JBFormReferenceController.prototype.getSaveCalls = function(){

		var   currentModel      = this.currentData[0]
			, originalModel     = this.originalData[0]
			, currentProperty
			, originalProperty;

		if(currentModel) currentProperty = currentModel[this.referencedPropertyName];
		if(originalModel) originalProperty = originalModel[this.referencedPropertyName];

		console.log('JBFormReferenceController: current model is %o, original %o; currentProperty %o, originalProperty %o', currentModel, originalModel, currentProperty, originalProperty);

		/**
		 * This check is sufficient to detect if:
		 *   - the reference was removed (currentProperty === undefined)
		 *   - the reference has changed
		 *   - the reference was added   (originalProperty === undefined)
		 */
		if(originalProperty !== currentProperty){
			var saveCall = {
				data: {}
			};
			/**
			 * Set the original propertyName, i.e. the foreign key property (e.g id_city).
			 * @note: To reset the property we have to pass the empty string.
			 */
			saveCall.data[this.propertyName] = angular.isDefined(currentProperty) ? currentProperty : '';
			return [saveCall];
		}

		return [];
	};


















	function JBFormRelationController($scope, $attrs, $compile, $templateCache, componentsService, relationService, apiWrapper){
		JBFormReferenceController.call(this, $scope, $attrs, $compile, $templateCache, componentsService, relationService, apiWrapper);
		this.relationTypes = ['hasMany', 'hasManyAndBelongsToMany'];
		this.isMultiSelect = true;
	}

	/**
	 *
	 * @type {JBFormReferenceController}
	 */
	JBFormRelationController.prototype = Object.create(JBFormReferenceController.prototype);
	JBFormRelationController.prototype.constructor = JBFormRelationController;

	/**
	 * @todo: this might be implemented as a post-save call to ensure that the original entity was saved
	 * @todo: remove the workaround for content data on delete requests
	 * @returns {*}
	 */
	JBFormRelationController.prototype.getSaveCalls = function(){

		var   currentProperties  = this.mapProperties(this.currentData, this.propertyName)
			, calls;

		// check for items that are present in the original data and the current data
		calls = this.originalData.reduce(function(removeCalls, item){
			var value = item[this.propertyName];
			if(angular.isDefined(currentProperties[value])){
				// defined in both
				delete currentProperties[value];
			} else {
				// otherwise it is only defined in the the originalData and is therefore removed
				removeCalls.push({
					method    : 'DELETE'
					, url       : {
						  path       : [ this.relationName, value].join('/')
						, mainEntity : 'append'
					}
				});
			}
			return removeCalls;
		}.bind(this), []);
		// newly added items are all the items that remain in the current properties map
		Object.keys(currentProperties).forEach(function(value){
			calls.push({
				  method    : 'POST'
				, url       : {
					  path       : [ this.relationName, value].join('/')
					, mainEntity : 'append'
				}
			});
		}, this);
		return calls;
	};

	JBFormRelationController.prototype.getSelectFields = function () {
		var   selectFields   = this.relationService.extractSelectFields(this.getSuggestionTemplate())
			, prefixedFields;

		prefixedFields = selectFields.map(function (field) {
			return [this.relationName, field].join('.');
		}, this);

		return prefixedFields;
	};
	/**
	 * Creates a map between the value of a specific property and the item within a collection of items (assuming that
	 * the properties are unique).
	 *
	 * @param collection
	 * @param property
	 * @returns {{values: Array, map: {}}}
	 */
	JBFormRelationController.prototype.mapProperties = function(collection, property){
		return collection.reduce(function(map, item){
			map[item[property]] = item;
			return map;
		}, {});
	};

	JBFormRelationController.prototype.rateSpec = function(relation){
		var rating = 0;
		if(this.relationTypes.indexOf(relation.type) === -1)                return rating;
		//if(relation.property && this.propertyName === relation.property)    rating++;
		if(relation.name && this.relationName === relation.name)            		   rating++;
		if(relation.remote.resource && this.entityName === relation.remote.resource)   rating++;

		return rating;
	};

	JBFormRelationController.prototype.getSpec = function(data){

		var   relations = (data && data.relations) ? data.relations : []
			, ratedSpecs
			, maxRating = 0;

		if(!relations.length) return;

		ratedSpecs = relations.reduce(function(ratings, relation){
			var rating = this.rateSpec(relation);
			if(!ratings[rating]) ratings[rating] = [];
			ratings[rating].push(relation);
			maxRating = Math.max(maxRating, rating);
			return ratings;
		}.bind(this), {});

		if(maxRating === 0) return;
		return ratedSpecs[maxRating];
	};

	JBFormRelationController.prototype.adaptToSpec = function(fieldSpecs) {

		if(fieldSpecs.length !== 1){
			console.error(
				  'JBFormRelationController: the relation to entity %o using accessor (relation) %o does not seem to be unique and has multiple possible relations %o'
				, this.entityName
				, this.relationName
				, fieldSpecs
			);
			return false;
		}

		return JBFormReferenceController.prototype.adaptToSpec.call(this, fieldSpecs[0]);
	};

	_module.controller('JBFormReferenceController', [
		  '$scope'
		, '$attrs'
		, '$compile'
		, '$templateCache'
		, 'JBFormComponentsService'
		, 'RelationInputService'
		, 'APIWrapperService'
		, JBFormReferenceController
	]);

	_module.controller('JBFormRelationController', [
		  '$scope'
		, '$attrs'
		, '$compile'
		, '$templateCache'
		, 'JBFormComponentsService'
		, 'RelationInputService'
		, 'APIWrapperService'
		, JBFormRelationController
	]);

	_module.run(['$templateCache', function ($templateCache) {
		$templateCache.put('referenceComponentTemplate.html',
			'<div class="form-group">' +
				'<label jb-form-label-component ' +
						'label-identifier="{{$ctrl.getLabel()}}" ' +
						'is-required="$ctrl.isRequired()" ' +
						'is-valid="$ctrl.isValid()" ' +
						'ng-if="$ctrl.displayLabel()">' +
				'</label>' +
				'<div class="relation-select" ' +
						'relation-input ' +
						'ng-class="{ \'col-md-9\' : $ctrl.displayLabel() , \'col-md-12\' : !$ctrl.displayLabel() }" ' +
						'ng-model="$ctrl.currentData" ' +
						'relation-entity-endpoint="{{$ctrl.getEntityUrl()}}" ' +
						'relation-suggestion-template="{{$ctrl.suggestion}}" ' +
						'relation-search-field="{{$ctrl.searchField}}" ' +

						'relation-disable-remove-button="$ctrl.disableRemoveButton" ' +
						'relation-disable-new-button="$ctrl.disableNewButton" ' +
						'relation-disable-edit-button="$ctrl.disableEditButton" ' +

						'relation-is-deletable="$ctrl.isDeletable()" ' +
						'relation-is-creatable="$ctrl.isCreatable()" ' +
						'relation-enable-fulltext-search="$ctrl.enableFulltext" ' +

						'relation-result-count="$ctrl.resultCount " ' +
						'relation-is-readonly="$ctrl.isReadonly" ' +
						'relation-is-multi-select="$ctrl.isMultiSelect" ' +
						'relation-filter="$ctrl.filters" ' +
						'relation-is-interactive="$ctrl.isInteractive"> ' +
				'</div>' +
			'</div>');
	}]);
})();
(function(undefined){
    "use strict";
    var _module = angular.module('jb.formComponents');

    function JBFormRepeatingViewController(componentsService, $compile, $scope, $timeout, $q){
        this.componentsService  = componentsService;
        this.componentsRegistry = null;
        this.$compile           = $compile;
        this.$scope             = $scope;
        this.type               = 'JBFormRepeating';
        this.optionData         = null;
        this.$timeout           = $timeout;
        this.$q                 = $q;
        this.entities           = [undefined];
    }

    JBFormRepeatingViewController.prototype.preLink = function(scope){
        // listens to all events coming from within
        // todo: the unregistration is triggered for all elements if we change the amount of entities (so the view might be empty)
        this.componentsRegistry = this.componentsService.registryFor(scope);
        this.componentsRegistry.listen();
        scope.$on('removeElement', function(event, index){
            event.stopPropagation();
            if(this.isReadonly === true) return;
            this.removeElement(index);
        }.bind(this));
    };

    JBFormRepeatingViewController.prototype.postLink = function(scope){
        this.componentsService.registerComponent(scope, this);
    };

    JBFormRepeatingViewController.prototype.getSelectFields = function(){
        return this.componentsRegistry.getSelectFields();
    };

    JBFormRepeatingViewController.prototype.getSaveCalls = function(){
        if(this.isReadonly === true) return [];
        return this.componentsRegistry.getSaveCalls();
    };

    JBFormRepeatingViewController.prototype.afterSaveTasks = function(id){
        if(this.isReadonly === true) return;
        return this.componentsRegistry.afterSaveTasks(id);
    };

    JBFormRepeatingViewController.prototype.beforeSaveTasks = function(entity){
        if(this.isReadonly === true) return;
        return this.componentsRegistry.beforeSaveTasks(entity);
    };

    JBFormRepeatingViewController.prototype.isValid = function(){
        if(this.isReadonly === true) return true;
        return this.componentsRegistry.isValid();
    };

    JBFormRepeatingViewController.prototype.registerAt = function(parent){
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
        parent.registerGetDataHandler(this.handleGetData.bind(this));
    };

    JBFormRepeatingViewController.prototype.unregisterAt = function(parent){
        parent.unregisterOptionsDataHandler(this.handleOptionsData);
        parent.unregisterGetDataHandler(this.handleGetData);
    };

    /*
     * Due to the fact that the inner entities are usually included in an ng-repat directive, we need to make
     * sure that at least one view was rendered.
     */
    JBFormRepeatingViewController.prototype.handleOptionsData = function(optionsData){
        this.optionData = optionsData;
        return this.$timeout(function(){
            return this.componentsRegistry.optionsDataHandler(optionsData);
        }.bind(this));

    };
    // We assume that the data we got delivered is an array?
    // now we should add a new copy of the inner view to all
    // @todo: use arrow functions
    // @todo: do we need to trigger two digests to be sure that all sub views are unlinked?
    JBFormRepeatingViewController.prototype.handleGetData = function(data){
        return this.$timeout(function(){
                if(data && data[this.entityName]){
                    this.entities = data[this.entityName];
                } else {
                    this.entities = [];
                }
                this.data = data;
            }.bind(this))
            .then(function(){
                this.distributeOptionsAndData(this.optionData, data, 0);
            }.bind(this));
    };

    JBFormRepeatingViewController.prototype.addElement = function(index){

        if(this.isReadonly) return;

        this.entities.push({isDummy: true});
        console.log('JBFormRepeatingViewController: Added element, entities are %o', this.entities);

        //todo: if we distribute the data like this, the lower form view adapters reset their entity, fix this.
        var data = {};
        data[this.entityName] = this.entities;

        return this.distributeOptionsAndData(this.optionData, data, this.entities.length - 1);
    };

    JBFormRepeatingViewController.prototype.distributeOptionsAndData = function(options, data, startIndex){
        return this.$timeout(function() {
            this.componentsRegistry
                .optionsDataHandler(options)
                .then(function(success) {
                        return this.componentsRegistry.distributeIndexedFrom(data, startIndex);
                    }.bind(this)
                    , function(error) {
                        console.error(error);
                    });
        }.bind(this))
    };

    JBFormRepeatingViewController.prototype.removeElement = function(index){

        if(this.isReadonly) return;

        var   component   = this.componentsRegistry.componentAt(index)
            , basePromise = this.$q.when()
            , self        = this;

        return basePromise
            .then(function(success){
                self.entities.splice(index, 1);
            })
            .then(function(success){
                return self.$timeout(function(){
                    return self.componentsRegistry.optionsDataHandler(self.optionData);
                });
            }.bind(this)).catch(function(error){
                console.error(error);
            });
    };

    _module.controller('JBFormRepeatingViewController', [
          'JBFormComponentsService'
        , '$compile'
        , '$scope'
        , '$timeout'
        , '$q'
        , JBFormRepeatingViewController
    ]);

    _module.directive('jbFormRepeatingView', ['$compile', '$parse', function($compile, $parse){
        return {
              scope             : true
            , bindToController  : true
            , controllerAs      : '$ctrl'
            , controller        : 'JBFormRepeatingViewController'
            , link              : {

                  pre: function(scope, element, attrs, ctrl){
                    ctrl.preLink(scope);
                }

                , post: function(scope, element, attrs, ctrl){

                    var   hasReadonlyFlag = attrs.hasOwnProperty('isReadonly')
                        , readonlyGetter;

                    if(hasReadonlyFlag){
                        readonlyGetter = $parse(attrs.isReadonly);
                        scope.$watch(function(){
                            return readonlyGetter(scope.$parent);
                        }, function(isReadonly){
                            ctrl.isReadonly = isReadonly === true;
                        });
                    }

                    attrs.$observe('entityName', function(newValue){
                        ctrl.entityName = newValue;
                    });

                    attrs.$observe('buttonText', function(newValue){
                        ctrl.buttonText = newValue;
                        scope.buttonText = newValue;
                    });

                    ctrl.postLink(scope);

                    scope.addElement = function(event, index){
                        console.log('jbFormRepeatingView: Add element');
                        if(event) event.preventDefault();
                        return ctrl.addElement(index);
                    };

                    scope.removeElement = function(event, index){
                        if(event) event.preventDefault();
                        return ctrl.removeElement(index);
                    };
                }
            }
        }
    }]);
})();
(function (undefined) {

    'use strict';

    // Bind to form components module.
    var _module = angular.module('jb.formComponents');

    /**
     * Helper function to properly extract the parent id from the options data.
     */

    function getParentId(optionsData, entity){
        var   keys  = optionsData.primaryKeys
            , key   = keys[0];

        if(keys.length !== 1) throw Error('The entity used in a form view needs to have a single field primary key');
        return entity[key];
    }

    function JBFormViewAdapterReferenceStrategy(formView, $q, api, scope){
        this.formView           = formView;
        this.optionsData        = null;
        this.initialId          = null;
        this.parentOptionsData  = null;
        this.isDeleted          = false;
        this.$q                 = $q;
        this.parentId           = null;
        this.setupListeners(scope);
    }

    /**
     * Since the Reference is not made for the use in repeating views, we do not emit the corresponding event to parent scopes.
     *
     * @param scope
     */
    JBFormViewAdapterReferenceStrategy.prototype.setupListeners = function(scope){
        scope.$on('removedDetailView', function(event){
            event.stopPropagation();
        });
    };

    JBFormViewAdapterReferenceStrategy.prototype.handleOptionsData = function(data){
        this.parentOptionsData  = data;
        this.optionsData        = this.formView.getSpecFromOptionsData(data);
        return this.formView.getOptionsData();
    };

    JBFormViewAdapterReferenceStrategy.prototype.beforeSaveTasks = function(){
        return this.formView.makeSaveRequest();
    };

    JBFormViewAdapterReferenceStrategy.prototype.afterSaveTasks = function(id){
        return id;
    };

    JBFormViewAdapterReferenceStrategy.prototype.getReferencingFieldName = function(){
        return this.optionsData.property;
    };
    /**
     * Extracts the id of the nested object and extracts the data the form view has to distribute.
     * @param data
     */
    JBFormViewAdapterReferenceStrategy.prototype.handleGetData = function(data){

        var   id, content;

        if(data){
            id      = data[this.getReferencingFieldName()];
            content = data[this.formView.getEntityName()];
            this.parentId   = getParentId(this.parentOptionsData, data);
        }

        this.initialId  = id;
        this.formView.setEntityId(id);
        return this.formView.distributeData(content);
    };

    JBFormViewAdapterReferenceStrategy.prototype.getSelectFields = function(){
        var selects = this.formView.getSelectParameters().map(function (select) {
                return [this.formView.getEntityName(), select].join('.');
            }.bind(this));
        // add the referenced property name to the selects
        return [this.getReferencingFieldName()].concat(selects);
    };

    JBFormViewAdapterReferenceStrategy.prototype.isValid = function(){
        // add the referenced property name to the selects
        return this.formView.isValid();
    };

    JBFormViewAdapterReferenceStrategy.prototype.getSaveCalls = function(){

        var   calls    = this.formView.generateSaveCalls()
            , call     = {};

        if(this.initialId == this.formView.getEntityId()) return calls;
        // id has changed
        call.data   = {};
        call.data[ this.getReferencingFieldName() ] = this.formView.getEntityId();
        return [ call ].concat(calls);
    };

    JBFormViewAdapterReferenceStrategy.prototype.deleteRelation = function(){
        if(this.formView.isNew() || !this.parentId) return;

        var endpoint = [
            this.optionsData.name
            , this.formView.getEntityId()
            , this.parentOptionsData.resource
            , this.initialParentId
        ].join('/');

        return this.api.delete(endpoint);
    };


    /**
     * Inverse Reference (belongs to) handling for nested form views.
     *
     * @todo: in the future we probably need to be able to pick a certain element out of the collection (itemIndex)
     *
     * @param formView
     * @constructor
     */
    function JBFormViewAdapterInverseReferenceStrategy(formView, $q, api, scope){
        this.formView           = formView;
        this.optionsData        = null;
        this.initialParentId    = null;
        this.parentId           = null;
        this.parentOptionsData  = null;
        this.itemIndex          = 0;
        this.isDeleted          = false;
        this.$q                 = $q;
        this.api                = api;
        this.hadData            = false;
        this.initialize(formView);
        this.setupListeners(scope);
    }

    JBFormViewAdapterInverseReferenceStrategy.prototype.setupListeners = function(scope) {
        scope.$on('deletedDetailView', function(event) {
            var currentScope = event.currentScope;
            event.stopPropagation();
            currentScope.$parent.$emit('removeElement', this.itemIndex);
        }.bind(this));
    };

    /**
     * This one should add the save call at the form-view.
     * @todo: add a validator which checks if the reference to the parent form-view is required!
     * @todo: check this, there are cases where the parent id might be the same (if we create a new sub entity in relation to a parent)
     *
     * This is a more secure way of setting up the relation because the related entity might need the id to be saved.
     * Therefore we cannot set it using the default endpoint.
     *
     * @param formView
     */
    JBFormViewAdapterInverseReferenceStrategy.prototype.initialize = function(formView){
        var self = this;

        formView.registerComponent({
              registerAt:   function(parent){}
            , unregisterAt: function(parent){}
            , isValid:      function(){}
            , getSaveCalls: function(){
                var call = { data: {} };
                if(self.initialParentId == self.parentId && angular.isDefined(self.formView.getEntityId())) return [];
                call.data[ self.getReferencingFieldName() ] = self.parentId;
                return [ call ];
            }
        });
    };

    JBFormViewAdapterInverseReferenceStrategy.prototype.handleOptionsData = function(data){
        this.optionsData        = this.formView.getSpecFromOptionsData(data);
        this.parentOptionsData  = data;
        return this.formView.getOptionsData();
    };

    /**
     * @todo: move this to the `afterSaveTasks`
     * @todo: set the entity id on the current detail view (is this possible?)
     */
    JBFormViewAdapterInverseReferenceStrategy.prototype.afterSaveTasks = function(id){
        this.parentId = id;
        return this.formView.makeSaveRequest().then(function(){
            return id;
        });
    };

    JBFormViewAdapterInverseReferenceStrategy.prototype.beforeSaveTasks = function(){};

    JBFormViewAdapterInverseReferenceStrategy.prototype.getReferencingFieldName = function(){
        return this.optionsData.remote.property;
    };
    /**
     * Extracts the id of the nested object and extracts the data the form view has to distribute.
     * @todo: how should this work if there is no entity!! check that
     * @param data
     */
    JBFormViewAdapterInverseReferenceStrategy.prototype.handleGetData = function(data, index){

        var   content = (data) ? data[this.formView.getEntityName()] : data
            , id
            , parentId;

        if(angular.isDefined(index)) this.itemIndex = index;

        if(content){
            if(content.length) content = this.getEntityFromData(content);
            this.hadData = content.isDummy !== true;
            parentId    = getParentId(this.parentOptionsData, data);
            id          = this.formView.getOwnId(content);
        }

        this.initialParentId = parentId;
        this.formView.setEntityId(id);
        return this.formView.distributeData(content);
    };

    JBFormViewAdapterInverseReferenceStrategy.prototype.getEntityFromData = function(data){
        return data[this.itemIndex];
    };

    // @todo: check for aliases
    JBFormViewAdapterInverseReferenceStrategy.prototype.getSelectFields = function(){
        var   selects = this.formView.getSelectParameters().map(function (select) {
            return [this.formView.getEntityName(), select].join('.');
        }.bind(this));
        return selects;
    };

    JBFormViewAdapterInverseReferenceStrategy.prototype.isValid = function(){
        // add the referenced property name to the selects
        return this.formView.isValid();
    };

    JBFormViewAdapterInverseReferenceStrategy.prototype.getSaveCalls = function(){
        return [];
    };

    JBFormViewAdapterInverseReferenceStrategy.prototype.getEndpoint = function(parentId){
        return [
            this.optionsData.name
            , this.formView.getEntityId()
            , this.parentOptionsData.resource
            , parentId
        ].join('/');
    };

    function JBFormViewMappingStrategy(formView, $q, api, scope){
        this.formView           = formView;
        this.optionsData        = null;
        this.initialParentId    = null;
        this.parentId           = null;
        this.parentOptionsData  = null;
        this.rootEntity         = null;
        this.itemIndex          = 0;
        this.$q                 = $q;
        this.api                = api;
        this.hadData            = false;
        this.setupListeners(scope);
    }

    JBFormViewMappingStrategy.prototype.setupListeners = function(scope){
        scope.$on('deletedDetailView', function(event){
            var currentScope = event.currentScope;
            event.stopPropagation();
            this.deleteRelation()
                .then(function(){
                    currentScope.$parent.$emit('removeElement', this.itemIndex);
                }.bind(this),
                function(error){
                    console.error(error);
                });
        }.bind(this));
    };

    JBFormViewMappingStrategy.prototype.handleOptionsData = function(data){
        this.optionsData        = this.formView.getSpecFromOptionsData(data);
        this.parentOptionsData  = data;
        this.rootEntity         = data.resource;
        return this.formView.getOptionsData();
    };

    /**
     * 1. Extract the data from the get call (usually invoked by a components registry passing in an index)
     * 2. Get the id from the parent entity (used to create the mapping)
     * 3. Get the id from the child entity
     * 4. Set the id on the detail view
     * 5. Distribute the data
     *
     * @todo: use the accessor name to extract the data instead of the entity name
     * @param data
     * @param index
     */
    JBFormViewMappingStrategy.prototype.handleGetData = function(data, index){

        var   content = (data) ? data[this.formView.getEntityName()] : data
            , id
            , parentId;

        if(angular.isDefined(index)) this.itemIndex = index;

        if(content){
            if(content.length) content = this.getEntityFromData(content);
            this.hadData    = content.isDummy !== true;
            parentId        = getParentId(this.parentOptionsData, data);
            id              = this.formView.getOwnId(content);
        }

        this.initialParentId = parentId;
        this.formView.setEntityId(id);

        return this.formView.distributeData(content);
    };

    JBFormViewMappingStrategy.prototype.getEntityFromData = function(data){
        return data[this.itemIndex];
    };

    JBFormViewMappingStrategy.prototype.isValid = function(){
        return this.formView.isValid();
    };

    /**
     * @todo: take the relation name instead of the entity name
     * @returns {Array}
     */
    JBFormViewMappingStrategy.prototype.getSelectFields = function(){
        return this.formView.getSelectParameters().map(function (select) {
            return [this.optionsData.name, select].join('.');
        }.bind(this));
    };

    JBFormViewMappingStrategy.prototype.afterSaveTasks = function(id) {
      this.parentId = id;
      return this.formView
        .makeSaveRequest()
        .then(function() {
          return this.createRelation(id);
        }.bind(this))
        .then(function() { return id; });
    };

    JBFormViewMappingStrategy.prototype.createRelation = function(parentId){
        // the relation already existed
        if(this.hadData)  return this.$q.when();
        return this.api.post(this.getEndpoint(parentId));
    };

    JBFormViewMappingStrategy.prototype.getEndpoint = function(parentId){
        return [
              this.optionsData.name
            , this.formView.getEntityId()
            , this.parentOptionsData.resource
            , parentId
        ].join('/');
    };

    JBFormViewMappingStrategy.prototype.beforeSaveTasks = function(){};

    JBFormViewMappingStrategy.prototype.getSaveCalls = function(){
        return [];
    };

    JBFormViewMappingStrategy.prototype.deleteRelation = function() {
        if(!this.initialParentId || this.formView.isNew() || !this.hadData) return this.$q.when();
        return this.api.delete(this.getEndpoint(this.initialParentId));
    };

    /**
     * Inverse Reference (belongs to) handling for nested form views.
     *
     * @todo: in the future we probably need to be able to pick a certain element out of the collection (itemIndex)
     *
     * @param formView
     * @constructor
     */

    function JBFormViewAdapter($q, formView, api, scope){
        this.optionsData    = null;
        this.$q             = $q;
        this.formView       = formView;
        this.strategy       = null;
        this.api            = api;
        this.scope          = scope;
    }

    JBFormViewAdapter.prototype.getSaveCalls = function(){
        return this.strategy.getSaveCalls();
    };

    JBFormViewAdapter.prototype.registerAt = function(parent){
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
        parent.registerGetDataHandler(this.handleGetData.bind(this));
    };

    JBFormViewAdapter.prototype.unregisterAt = function(parent){
        parent.unregisterOptionsDataHandler(this.handleOptionsData);
        parent.unregisterGetDataHandler(this.handleGetData);
    };

    /**
     * 1. reference:    instantiate a reference strategy
     * 2. belongsTo:    instantiate an inverse reference strategy
     * @todo: properly extract the options data by taking aliases into account
     * @todo: switch into an error state if there are no options data
     */
    JBFormViewAdapter.prototype.handleOptionsData = function(data){
        // the extraction of the options data works as long as there is no alias!
        var spec = this.formView.getSpecFromOptionsData(data);
        if(!spec) {
            return console.error('No options data found for form-view %o in %o', this.formView.entityName, this.formView);
        }

        this.strategy = this.createViewAdapterStrategy(spec);
        return this.strategy.handleOptionsData(data);
    };

    JBFormViewAdapter.prototype.createViewAdapterStrategy = function(options){
        switch(options.type){
            case 'hasManyAndBelongsToMany':
                return new JBFormViewMappingStrategy(this.formView, this.$q, this.api, this.scope);
            case 'hasMany':
                return new JBFormViewAdapterInverseReferenceStrategy(this.formView, this.$q, this.api, this.scope);
            case 'hasOne':
            default:
                return new JBFormViewAdapterReferenceStrategy(this.formView, this.$q, this.api, this.scope);
        }
    };

    /**
     * 1. reference:    pass the data
     * 2. belongsTo:    pass the first object
     */
    JBFormViewAdapter.prototype.handleGetData = function(data, index){
        return this.strategy.handleGetData(data, index);
    };

    /**
     * 1. reference:    initialize the saving
     * 2. belongsTo:    do nothing
     */
    JBFormViewAdapter.prototype.beforeSaveTasks = function(){
        return this.strategy.beforeSaveTasks();
    };

    /**
     * 1. reference:    do nothing (id is set in the save calls)
     * 2. belongsTo:    initialize the saving but add a save call which sets the related id
     */
    JBFormViewAdapter.prototype.afterSaveTasks = function(id){
        return this.strategy.afterSaveTasks(id);
    };

    JBFormViewAdapter.prototype.getSelectFields = function(){
        return this.strategy.getSelectFields();
    };

    JBFormViewAdapter.prototype.isValid = function(){
        return this.formView.isReadonly || (this.strategy && this.strategy.isValid());
    };

    _module.factory('JBFormViewAdapterService', [
          '$q'
        , 'APIWrapperService'
        , function($q, api){
            return {
                getAdapter : function(formView, scope){
                    return new JBFormViewAdapter($q, formView, api, scope);
                }
            }
        }]);
})();
/**
* Loads detail view template and controller that correspond to the current URL
* Then compiles them into the current element
* Loaded in $routeProvider
*/
angular
.module( 'jb.formComponents' )
.controller( 'JBFormViewLoaderController', [ '$scope', '$location', '$http', '$q', '$compile', function( $scope, $location, $http, $q, $compile ) {


	var self = this;


	// Get entity & id from path
	var path			= $location.path()
		, pathParts		= path.split( '/' );

	// Path missing
	if( !pathParts.length ) {
		alert( 'no path provided' );
		return;
	}

	var entityName		= pathParts[ 1 ]
		, entityId		= pathParts[ 2 ];

	console.log( 'DetailViewLoader: entity name is %o, id %o', entityName, entityId );



	/**
	* Generate controller's name and template URL from current url
	*/
	self.getControllerAndTemplate = function( entityName, entityId ) {
		
		// EntityName is missing
		if( !entityName ) {
			return false;
		}

		// camel-case instead of camelCase
		var entityDashed		= entityName.replace( /[A-Z]/g, function( match ) { return '-' + match.toLowerCase(); } )
			, templateBasePath	= 'src/app/' + entityDashed + '/'
			, templatePath
			, controllerName;

		// List
		if( !entityId ) {
			controllerName	= 'backoffice' + entityName.substring( 0, 1 ).toUpperCase() + entityName.substring( 1 ) + 'ListController';
			templatePath	= templateBasePath + entityDashed + '-list.tpl.html';
		}


		// New or Edit (same template)
		else if( entityId ==='new' || !isNaN( parseInt( entityId, 10 ) ) ) {
			templatePath	= templateBasePath + entityDashed + '-detail.tpl.html';
		}

		// Id is not 'new' nor a number
		else {
			console.error( 'unknown entity id: %o', entityId );
		}

		return {
			controllerName		: controllerName
			, templateUrl		: templatePath
		};

	};


	/**
	* Gets template from server, returns promise
	*/
	self.getTemplate = function( templateUrl ) {
		return $http( { method: 'GET', url: templateUrl,  headers: { 'accept': 'text/html' } } )
			.then( function( data ) {
				console.log( 'DetailViewLoader: got template %o', data );
				return data.data;
			}, function( err ) {
				return $q.reject( err );
			} );
	};


	/**
	* Attachs template and controller to [ng-view], renders it 
	*/
	self.renderTemplate = function( template, controllerName) {
		
		var ngView		= $( '[ng-view], [data-ng-view]' );

		// Create parent that holds controller
		var parent		= $( '<div></div>' );
		if( controllerName ) {
			parent.attr( 'data-ng-controller', controllerName );
		}
		parent.html( template );

		console.log( 'DetailViewLoader: render Template %o with controller %o', parent, controllerName );

		ngView
			.empty()
			.append( parent );

		$compile( parent )( $scope );

	};




	/**
	* Gets the template and controller to be rendered, and does so.
	*/
	self.init = function() {
	
		var controllerAndTemplate = self.getControllerAndTemplate( entityName, entityId );

		// Entity was not available, getControllerAndTemplate returned false.
		if( !controllerAndTemplate ) {
			self.renderTemplate( '404 – Page could not be found', false );
			return;
		}


		// Everything fine
		var templateUrl			= controllerAndTemplate.templateUrl
			, controllerName	= controllerAndTemplate.controllerName;

		self.getTemplate( templateUrl )
			.then( function( data ) {
				self.renderTemplate( data, controllerName );
			}, function( err ) {

				var ngView		= $( '[ng-view], [data-ng-view]' );
				ngView.text( 'Template ' + templateUrl + ' not found. Entity can\'t be edited' );

			} );

	};


	self.init();




} ] );
(function (undefined) {
	'use strict';

	/**
	 * Directive for every detail view:
	 * - Gets field data from server (through an OPTIONS call)
	 * - Input components (text, images, relations) may register themselves
	 * - Stores data on server
	 *
	 * Child components must/may implement the following methods:
	 * - registerAt(parent) which is used to register options and get call handlers
	 * - getSaveCalls: Returns POST calls (optional)
	 * - isValid: Returns true if component is valid (optional)
	 * - getSelectFields: Returns select fields (replaces the select property)
	 */

	var _module = angular.module('jb.formComponents');
	/*
	 * @todo: add a readonly mode
	 * @todo: prevent the user from seeing stuff it is not able to!
	 * @todo: catch 404 errors and add an error state
	 * @todo: add a loader
	*/
	_module.directive('jbFormView', ['$compile', function ($compile) {

		return {
			link: {
				pre: function (scope, element, attrs, ctrl) {
					if (angular.isFunction(ctrl.preLink)) {
						ctrl.preLink(scope, element, attrs);
					}
				}
				, post: function (scope, element, attrs, ctrl, transclude) {
					var errorMessage = angular.element('<h1 ng-if="$ctrl.error">{{$ctrl.error}}</h1>');
					element.addClass('jb-form-view');
					ctrl.init(scope, element, attrs);
				}

			}
			, controller        : 'DetailViewController'
			, bindToController  : true
			, controllerAs      : '$ctrl'

			/**
			 * We cannot use an isolated scope here: the nested elements would be attached to the parent scope
			 * and we would not be able to listen to the corresponding events.
			 *
			 * Otherwise we'd have to use transclusion.
			 *
			 *  {
				 *        'entityName'  : '<'
				 *      , 'entityId'    : '<'
				 *      , 'isRoot'      :
				 *      , 'index'       : '<'
				 *      , 'isReadonly'  : '<'
				 *  }
			 */
			, scope: true
		};

	}]);

	_module.controller('DetailViewController',
		[
				'$scope'
			, '$rootScope'
			, '$q'
			, '$attrs'
			, '$filter'
			, '$state'
			, 'APIWrapperService'
			, 'JBFormComponentsService'
			, 'BackofficeAPIWrapperService'
			, 'JBFormViewAdapterService'
			, '$parse'
			, function ($scope, $rootScope, $q, $attrs, $filter, $state, APIWrapperService, subcomponentsService, boAPIWrapper, adapterService, $parse) {


			/**
			 * Private vars
			 */

			var self = this
				, element;

			self.componentsService  = subcomponentsService;
			self.componentsRegistry = null;
			self.adapterService     = adapterService;
			self.index              = 0;

						// True if all necessary values (see the corresponding promises in this.init()) were set. 
						// Once initialized, get data whenever something changes.
						self.initialized        = false;

			/**
			 * Data we loaded ourselves.
			 */
			self.optionData         = null;

			$scope.$watchGroup(['$ctrl.entityName', '$ctrl.entityId'], function () {
				self.setTitle();
			});

			/**
			 * Set up the registry waiting for subcomponents in the pre-link phase.
			 */
			self.preLink = function (scope, element, attrs) {
				self.componentsRegistry = self.componentsService.registryFor(scope);
				self.componentsRegistry.listen();
			};

			/**
			 * Extracts the global entityName and entityId from the $state service.
			 */
			self.parseUrl = function () {
				return {
					name: $state.params.entityName
					// Only return id if it's an ID (and not 'new'). If we return «new», a GET request will be made to /entityName/new
					,
					id: ( $state.params.entityId && $state.params.entityId !== 'new' ) ? $state.params.entityId : false
					,
					isNew: $state.params.entityId === 'new' ? true : false
				};

			};

			self.getEntityId = function () {
				return $scope.entityId;
			};

			self.getEntityName = function () {
				return $scope.entityName;
			};

			self.getEntityUrl = function () {
				var url = self.serviceName ? '/' + self.serviceName + '.' : '/';
				url += self.getEntityName();
				if (self.getEntityId()) {
					url += '/' + self.getEntityId();
				}
				return url;
			};

			/**
			 * Title
			 * @todo: Remove the dependency to the state in here
			 */

			self.setTitle = function () {
				var   titleSuffix = self.getEntityName()
					, titlePrefix = $filter('translate')('web.backoffice.create');

				if (!self.isNew()) {
					titlePrefix = $filter('translate')('web.backoffice.edit');
					titleSuffix = titleSuffix + ' #'+ self.entityId;
				}
				$scope.title = [titlePrefix , titleSuffix].join(': ');
			};

			/**
			 * Init (called from directive's link function)
			 * Components of interest (old version):
			 *  - data-auto-form-element
			 *  - data-hidden-input
			 *  - data-backoffice-tree-component
			 *  - data-backoffice-relation-component
			 *  - data-backoffice-component
			 *  - data-backoffice-image-component
			 *  - data-backoffice-image-detail-component
			 *  - data-backoffice-video-component
			 *  - data-backoffice-date-component
			 *  - data-backoffice-media-group-component
			 *  - data-backoffice-data-component
			 */

			self.init = function (scope, el, attrs) {
				var   promises = []
					, element = el
					, readonlyGetter;

				/**
				 * Observe these values.
				 * 1. If there is no entity name and id set, load it from the state, and set the value (is the isRoot property important then?).
				 * 2. If there is an entity name and no id, try to extract the primary key from the get data.
				 * 3. If both are present, wait for them to be updated.
				 *
				 * @todo: can we detect if we are root by checking if 'registerAt' was called?
				 */

				// reset the entity id passed through the scope
				// @todo: bind this shit to the controller
				self.setEntityId(undefined);

				self.isRoot             = attrs.hasOwnProperty('isRoot');
				self.restrictDelete     = attrs.hasOwnProperty('restrictDelete');
				self.hasEntityName      = attrs.hasOwnProperty('entityName');
				self.hasEntityId        = attrs.hasOwnProperty('entityId');
				self.hasReadonlyFlag    = attrs.hasOwnProperty('isReadonly');
				self.hasServiceName     = attrs.hasOwnProperty('serviceName');

				if(attrs.hasOwnProperty('nonInteractive')){
					self.isNonInteractive = true;
				}

				// Service name: If the entity is on a separate distributed service (e.g. shop), use
				// serviceName.entityName as URL, but on OPTIONs requests, the field we look fore is onl
				// entityName (without the serviceName prefix)
				if (self.hasServiceName) {
					var serviceDeferred  = $q.defer();
					promises.push(serviceDeferred.promise);
					attrs.$observe('serviceName', function(newValue){
						if(!newValue) return;
						self.serviceName = newValue;
						$scope.serviceName = newValue;
						serviceDeferred.resolve();
					});

				}

				if (self.hasEntityName) {

					var   nameDeferred  = $q.defer();
					promises.push(nameDeferred.promise);
					attrs.$observe('entityName', function(newValue){
						if(!newValue) return;
						self.setEntityName(newValue);
						nameDeferred.resolve();
					});
				}

				if (self.hasEntityId) {
					var   idDeferred = $q.defer();
					promises.push(idDeferred.promise);
					attrs.$observe('entityId', function(newValue){

														console.log('jbFormView: Entity ID changed to %o', newValue);

							if(!newValue) return;
							self.setEntityId(newValue === 'new' ? undefined : newValue);

														// Enitty was already initialized: Get new data instantly whenever ID changes.
														if (self.initialized) {
																console.log('jbFormView: Entity ID changed, controller was initialized');
																self.getData();
														}

							idDeferred.resolve();
					});
				}
				if (!self.hasEntityName && !self.hasEntityId) {
					var stateParams = self.parseUrl();
					self.setEntityName(stateParams.name);
					self.setEntityId(stateParams.id);
				}

				if(self.hasReadonlyFlag) {
					readonlyGetter = $parse(attrs.isReadonly);
					scope.$watch(function(){
						return readonlyGetter(scope.$parent);
					}, function(value){
						if(value === true || value === false){
							self.isReadonly = value;
							if(value === true) {
								element.addClass('jb-form-readonly');
							}
						}
					});
				}


				if(!self.isRoot){
					self.adapter = self.adapterService.getAdapter(this, scope);
					self.componentsService.registerComponent(scope, self.adapter);
				}

				// @todo: store the promises otherwise and chain them as soon as the option handler is invoked (to make shure all data is available)
				$q.all(promises).then(function () {

										self.initialized = true;

					// load option data if we are root
					// todo: switch into read only mode or display error message if we are not allowed to see the current entity
					if (self.isRoot){
						self.getOptionData()
							.then(self.checkAccessRights)
							.then(self.getData)
							.catch(function(err){
								console.error(err);
							});
					}
				});
			};

			self.isNew = function(){
				return !this.getEntityId() && this.getEntityId() !== 0;
			};

			self.checkAccessRights = function(optionData){
				return optionData;
			};

			self.setEntityName = function (name) {
				self.entityName = name;
				$scope.entityName = name;
			};

			self.setEntityId = function (id) {
				self.entityId = id;
				$scope.entityId = id;
			};

			/**
			 * This is shitty! We need to load more options data as soon as we receive the options to to be able to
			 * distribute options to the nested fields.
			 *
			 * @param fields
			 */
			self.internallyHandleOptionsData = function (data) {
				self.optionData = data;
				// todo: modifying data from cache is always a dumb ass idea!
				(data.properties || []).forEach(function(property){
					property.readonly = !!(data.permissions.update === false || self.isReadonly);
				});

				return self.componentsRegistry.optionsDataHandler(data);
			};

			self.getOptionsData = function(){
				return self.getOptionData();
			};

			self.getSpecFromOptionsData = function(data) {
				var relations = (data && data.relations && data.relations.length) ? data.relations : [];
				for(var i = 0; i < relations.length; i++){
					var relation = relations[i];
					if(relation.remote.resource === this.entityName) return relation;
				}
			};

			/**
			 * OPTION data
			 */
			self.getOptionData = function () {
				console.log('DetailView: Make OPTIONS call for %o', self.getEntityName());
				var url = self.serviceName ? '/' + self.serviceName + '.' : '/';
				url += self.getEntityName();
				return self
					.makeOptionRequest(url)
					.then(
							self.internallyHandleOptionsData
						, function (err) {
							$rootScope.$broadcast('notification', {
									'type': 'error'
								, 'message': 'web.backoffice.detail.optionsLoadingError'
								, variables: {errorMessage: err}
							});
						});
					};

			/**
			 * Makes options call, sets self.fields
			 * @todo: check if the fields are used somewhere
			 */
			self.makeOptionRequest = function (url) {
				return APIWrapperService.getOptions(url);
			};

			/**
			 * Use the events for that.
			 */
			self.register = function (el) {
				throw new Error('DEPRECATED');
			};

			self.registerComponent = function(component){
				this.componentsRegistry.registerComponent(component);
			};

			/**
			 * Collects the select fields of all the registered subcomponents. This is the internal API.
			 * @returns {Array}
			 */
			self.getSelectParameters = function () {
				return [this.getOwnIdField()].concat(self.componentsRegistry.getSelectFields());
			};

			/**
			 * Distributes the entity data (from the GET call) to the registered subcomponents by delegating
			 * to the getDataHandler of the registry.
			 */
			self.distributeData = function (data) {
					console.log('jbFormView: Distribute data %o', data);
					if (!data) data = {isDummy:true};
          // Push da shit to the scope
          //self.data = data;
					self.componentsRegistry.getDataHandler(data);
			};

			/**
			 * Make a GET request to the API, selecting all the fields the subcomponents request.
			 */
			self.getData = function () {
				return self
					.makeGetRequest()
					.then(
					self.distributeData
					, function (err) {
						// debugger;
						// @todo: if the entity is not available or the user is not able to access the entity we get a 404 (due to the tenant restriction)
						// if(err.statusCode)
						self.error = 'Unable to load!!';
						$rootScope.$broadcast('notification', {
								type      : 'error'
							, message   : 'web.backoffice.detail.loadingError'
							, variables : {
								errorMessage: err
							}
						});
					});

			};

			/**
			 * Get data for current entity from server, fire dateUpdate. Done after changes were saved.
			 */
			self.updateData = function () {
				return self.getData();
			};


			/**
			 * Gets current entity's data through GET call
			 */
			self.makeGetRequest = function () {

				var url = self.getEntityUrl();
				var select  = self.getSelectParameters();
				var selectHeader = self.concatSelectParameters(select);

				console.log('DetailView: Get Data from %o with select %o', url, select);
				if(self.isNew()) return $q.when();
				return APIWrapperService.request({
					url: url
					, headers: {select: selectHeader}
					, method: 'GET'
				}).then(
					function (data) {
						return data;
					}.bind(this)
					, function (err) {
						return $q.reject(err);
					});

			};

			self.concatSelectParameters = function(parameters){
				var fieldMap = (parameters || []).reduce(function(fields, field){
					if(field) fields[field] = true;
					return fields;
				}, {});
				return Object.keys(fieldMap)
			};

			///////////////////////////////////////////////////////////////////////////////////////////////
			//
			// Save
			//
			$scope.edit = function(){
				$state.go('app.detail', {
						entityName    : self.getEntityName()
					, entityId      : self.isNew() ? 'new' : self.getEntityId()
				});
			};
			/**
			 * Called when user clicks 'save'. Can be called manually through scope().
			 *
			 * @param <Boolean> dontNotifyOrRedirect            If true, no notification is shown and on successful creation, user is
			 *                                                _not_ redirected to the new entity. Needed for manual saving.
			 * @returns <Integer>                            ID of the current entity
			 */
			$scope.save = function (ev, dontNotifyOrRedirect, callback) {

				// Needed for nested detailViews: We don't want to propagate the save event to the parent detailView
				// See e.g. article in CC back office
				if (ev && angular.isFunction(ev.preventDefault)) {
					ev.preventDefault();
					ev.stopPropagation();
				}

				// We need to get the saved entity's id so that we can redirect the user to it
				// after it has been created (when user was on /entity/new)
				// Can't be returned, as we're using promises. Therefore pass an object to the save
				// call that will be filled with the id
				/*var returnValue = {
				 id: undefined
				 };*/
				if(self.isReadonly) return;
				return self
					.makeSaveRequest()
					.then(function (entityId) {
						// Entity didn't have an ID (was newly created): Redirect to new entity
						if (self.parseUrl().isNew && !dontNotifyOrRedirect) {
							$state.go('app.detail', {entityName: self.getEntityName(), entityId: self.getEntityId()});
						}
						// Do notify and redirect
						if (!dontNotifyOrRedirect) {
							console.log('DetailViewController: Show success message on %o', $rootScope);
							$rootScope.$broadcast('notification', {
								type: 'success'
								, message: 'web.backoffice.detail.saveSuccess'
							});
						}
						else {
							console.log('DetailViewController: Don\'t show any message or redirect');
						}

						self.updateData();

						if (callback) callback();

						return entityId || null;


					}).catch(function(err) {

							$rootScope.$broadcast('notification', {
								type: 'error'
								, message: 'web.backoffice.detail.saveError'
								, variables: {
									errorMessage: err.message
								}
							});

							return $q.reject(err);
					});

			};

			self.isValid = function () {
				return self.componentsRegistry && self.componentsRegistry.isValid()
			};
			/**
			 * Stores all component's data on server
			 */
			self.makeSaveRequest = function (ignoreReadonly) {
				if (!self.isValid()) return $q.reject(new Error('Not all required fields filled out.'));
				if(self.isReadonly && ignoreReadonly !== true) return $q.when(self.getEntityId());

				// Pre-save tasks (upload images)
				return self.executePreSaveTasks()

					// Save stuff on current entity
					.then(function (entity) {
						// current entity state
						return self.makeMainSaveCall();
					})
					.then(function (id) {
						return self.executePostSaveTasks(id);
					});

			};

			/**
			 * Executes tasks that must be done before the current entity is saved, i.e.
			 * create all entities that will be linked to this entity afterwards, like e.g.
			 * upload an image
			 * Calls beforeSaveTasks on registered components. They must return a promise.
			 */
			self.executePreSaveTasks = function () {
				var entity  = {};
				entity.meta = {};
				return self.componentsRegistry.getBeforeSaveTasks(entity);
			};
			/**
			 * This is the external api!
			 * @todo: move this to the relation strategy
			 */
			self.beforeSaveTasks = function(entity){
				var task = self.makeSaveRequest();
				return task;
			};

			/**
			 * Executes save tasks that must be executed after the main entity was created,
			 * e.g. save the order of images in a mediaGroup:
			 * 1. Save main entity (done through regular save call)
			 * 2. Update media links (/mediumGroup/id/medium/id) (done through regular save call)
			 * 3. Update order (GET all media from /mediumGroup, then set order on every single relation)
			 */
			self.executePostSaveTasks = function (id) {
				return self.componentsRegistry.getAfterSaveTasks(id);
			};

			/**
			 * @todo: make this more abstract and safe
			 * @param optionsData
			 * @returns {*}
			 */
			self.getIdFieldFrom = function(optionsData){
				return (optionsData && optionsData.primaryKeys) ? optionsData.primaryKeys[0] : null;
			};

			self.getOwnIdField = function(){
				return this.getIdFieldFrom(this.optionData);
			};

			self.getOwnId = function(data) {
				var primaryKey;
				if(!data) return null;
				primaryKey = this.getOwnIdField();
				return primaryKey ? data[primaryKey] : null;
			};
			/**
			 * Saves:
			 * - first, the data on the entity (creates entity, if not yet done)
			 *   by doing all calls going to /
			 * - second, all other things (e.g. relations that need the entity to be
			 *   existent)
			 * @return Promise        Parameter passed is null or mainEntity's id
			 *
			 * @todo: pre save tasks should create related entities and set the relation id (hasOne) (or set the field values)
			 * @todo: the main call should only save/create the current entity
			 * @todo: the post save tasks should create relations having access to the previously saved id (store it into a meta parameter)
			 */
			self.makeMainSaveCall = function () {

				var calls = self.generateSaveCalls();

				console.log('DetailView: Save calls for %o are %o', this.entityName, calls);

				var mainCall
					, relationCalls = []
					, mainCallData;

				// Split calls up in mainCall, needs to be done first
				// (main entity needs to be created before relations can be set)
				// Main calls start with /entityName or /entityName/entityId (for updates)
				// /entityName/entityId must be covered in case of redirects. Subsequent calls
				// to releations must be made to the new entityId.
				for (var i = 0; i < calls.length; i++) {

					// If url is an object it should never be a call to the mainEnity (as mainEntity: append or prepend will be
					// used and therefore a relation be created.
					var myOwnUrl = '/' + (self.serviceName ? self.serviceName + '.' : '');
					myOwnUrl += self.getEntityName();
					if (
						!angular.isObject(calls[i].url) &&
						(
							!calls[i].url ||
							calls[i].url.indexOf(myOwnUrl) === 0
						)
					) {
						mainCall = calls[i];
					}

					else {
						relationCalls.push(calls[i]);
					}

				}

				// entityId not yet set: New element – but has no fields or no required fields,
				// therefore no information might be provided, except for some relations.
				// If entity is not generated (what would happen as there's no data to store),
				// relations could not be created (POST to /entityName/otherEntityName/otherEntityId)
				// would fail, as entityId doesn't exist.
				if (!mainCall && !self.getEntityId()) {
					mainCall = {
						method: 'POST'
						, url: (self.serviceName ? '/' + self.serviceName + '.' : '/') + self.getEntityName()
					};
				}

				console.log('DetailView: Main save call is %o, other calls are %o', mainCall, relationCalls);
				var id = null;
				// Make main call
				return self.executeSaveRequest(mainCall)

					// Make all secondary calls (to sub entities) simultaneously
					.then(function (mainCallResult) {

						// Make mainCallData available to next promise
						mainCallData = mainCallResult;

						console.log('DetailView: Made main save call; got back %o', mainCallData);
						// Pass id of newly created object back to the Controller
						// so that user can be redirected to new entity
						id = self.getOwnId(mainCallData);
						if(id){
							console.log('DetailView: Entity id is %o', id);
							self.setEntityId(id);
						}

						var callRequests = [];
						relationCalls.forEach(function (call) {
							callRequests.push(self.executeSaveRequest(call));
						});

						return $q.all(callRequests);

					})

					// Make sure we pass back the id.
					.then(function () {
						return self.getEntityId();
					});


			};


			/**
			 * Adds the call componentCall gotten from a registered component to the
			 * calls variable that's sorted by urls and methods.
			 * Therefore, if multiple calls to the same url exists, it groups them together
			 * by an array item on calls and composes the data.
			 */
			self.addCall = function (componentCall, calls) {

				// Components may pass back just a data field – means that it's stored on the entity itself.
				// Get url from self.getEntityUrl, as it is needed to determine the method of the call
				// (PATCH or POST).
				if (!componentCall.url) {
					componentCall.url = self.getEntityUrl();
				}

				// Method's missing
				if (!componentCall.method) {

					// Test if URL has an ID (ends with /12329)
					// If it does, use patch, else post.
					if (/\/\d*\/?$/.test(componentCall.url)) {
						componentCall.method = 'PATCH';
					}
					else {
						componentCall.method = 'POST';
					}
				}

				// Check if call to url does already exit
				var call = this.getSaveCall(calls, componentCall.method, componentCall.url);

				// If componentCall has headers, treat it as a different call. To improve, we might
				// compare headers, but let's save that for better times.
				// Headers are e.g. used in treeFormData to store a tree (needs Content-Type: application/json)
				if (componentCall.hasOwnProperty('headers')) {
					call = false;
				}

				// Call doesn't yet exist
				if (!call) {
					call = {
						method: componentCall.method
						, url: componentCall.url
						, data: componentCall.data
						, headers: componentCall.headers || {}
					};
					calls.push(call);
				}

				// Add data
				else {

					// Don't do that if we're sending a string or array (e.g. when using application/json as Content-Type
					if (componentCall.data) {
						for (var p in componentCall.data) {
							call.data[p] = componentCall.data[p];
						}
					}

				}

			};


			/**
			 * Check if a call to method and url does already exist in calls. If it does, return it,
			 * else return false
			 * @param <Array> calls            Array of calls
			 * @pparam <String> method
			 * @param <String> url
			 */
			self.getSaveCall = function (calls, method, url) {

				// Default: empty array, if not found
				var saveCall = false;
				calls.some(function (call) {
					// Check if URL is the same. Normally use === comparator.
					// But if URL is not set, it might be false or '', therefore
					// use == comparator.
					var sameUrl = call.url === url || ( !call.url && !url )
						, sameMethod = call.method.toLowerCase() === method.toLowerCase();
					if (sameMethod && sameUrl) {
						saveCall = call;
						return true;
					}
				});
				return saveCall;

			};


			/**
			 * Makes POST or PATCH call to server to store data.
			 * @param <Object> data            Key: URL to be called
			 *                                Value: Data to be sent
			 * @param <String> basePath        The current entity's path (e.g. /event/18),
			 *                                needed to generate calls to relative URLs
			 * @return <Promise>                Promise of the corresponding call
			 */
			self.executeSaveRequest = function (call) {

				// Empty call (if there's no call to / to be made, e.g.)
				// Just resolve the promise
				if (!call) {
					console.log('DetailView: No call to be made');
					return $q.when(call);
				}

				// url
				// - Take current url + url, if it's relative (doesn't start with a /)
				// - Take url if it's absolute (starts with a /)
				var url;


				//
				// Generate final URL
				//


				// Object

				if (angular.isObject(call.url)) {

					// url.path missing – needs to be set if url is an object
					if (!call.url.path) {
						console.error('DetailViewController: url property is missing on path on %o', call);
						return $q.reject('Got invalid call data, path property missing on url for ' + JSON.stringify(call));
					}

					// entityName/entityId or entityName
					var mainEntityUrl = self.getEntityId() ?
					self.getEntityName() + '/' + self.getEntityId() :
						self.getEntityName();

					// Remove trailing and leading slashes
					var path = call.url.path.replace(/^\/*/, '').replace(/\/*$/, '');

					if (call.url.mainEntity === 'prepend') {

						url = '/' + mainEntityUrl + '/' + path;

					}
					else if (call.url.mainEntity === 'append') {

						url = '/' + path + '/' + mainEntityUrl;

					}

					else {
						url = call.url.path;
					}

				}

				// absolute
				else if (call.url && call.url.indexOf('/') === 0) {

					url = call.url;

				}


				// Relative URL

				else {

					url = '/' + self.getEntityName();

					// Only use entity's ID if it exists (i.e. we're not newly creating an entity)
					if (self.getEntityId()) {
						url += '/' + self.getEntityId();
					}

					// Append call.url, if available
					if (call.url) {
						url += '/' + call.url;
					}

				}

				console.log('DetailView: Make %s call to %s with %o. Call is %o, entityName is %o.', call.method, url, call.data, call, self.getEntityName());

				// Add datasourceId as long as it's needed
				// #todo remove when eE's ready
				if (!call.data) {
					call.data = {};
				}

				return APIWrapperService.request({
					url: url
					, data: call.data
					, method: call.method
					, headers: call.headers
				});

			};


			/**
			 * Goes through all inputs, collects their save calls (by calling getSaveCalls)
			 *
			 * getSaveCalls() may return:
			 * - false (no call to be made)
			 * - an array of objects or single object, where each object has the following properties
			 *     - url (mandatory): URL to be called as
			 *           - a <String>: If prefixed with a /, will be an absolute path, else relative to the
			 *             current entity
			 *           - an <Object> with the properties
			 *                   - path <String>: path
			 *                   - baseEntity <String> 'append|prepend' Whether and where to append
			 *                     the current entity plus its ID. If not set or another value,
			 *                     current entity is not used at all.
			 *     - method (mandatory, <String>): method to be used (GET,PATCH,POST)
			 *     - headers (optional, <Object>): an object of headers, e.g. { range: '0-10' }
			 *     - data (optional <Object>): data to be sent with a POST or PATCH request
			 * - a Promise
			 */
			self.generateSaveCalls = function () {
				if(self.isReadonly) return [];
				var saveCalls = self.componentsRegistry.getSaveCalls().reduce(function (calls, componentCalls) {
					self.addCall(componentCalls, calls);
					return calls;
				}, []);
				return saveCalls;
			};


			///////////////////////////////////////////////////////////////////////////////////////////////
			//
			// DELETE
			//
			self.unlink = function(){
				return $scope.$destroy();
			};

			$scope.$on('reloadViewData', function(event){
				if(self.isRoot){
					console.info('reloadView');
					if (event && event.stopPropagation) event.stopPropagation();
					self.getData();
				}
			});

			/**
			 * Deletes the entity.
			 * @todo: the redirection should not be a matter of the detail-view itself, if we have nested detail
			 * todo: let the adapter do the delete requests it is aware of the context of the entity and can trigger all the delete requests correctly
			 * @param <Boolean> nonInteractive        True if user should not be redirected to main view
			 */
			$scope.delete = function (event, nonInteractive, refreshView) {
				if(event){
					event.preventDefault();
					event.stopPropagation();
				}
				console.log('DetailView: Delete');

				var   confirmed         = false
					, interactive       = !(angular.isDefined(self.isNonInteractive) ? self.isNonInteractive : nonInteractive)
					, confirmMessage    = $filter('translate')('web.backoffice.detail.confirmDeletion');

				if(self.restrictDelete && !self.isRoot){
					return $scope.$emit('deletedDetailView', self);
				}

				confirmMessage += '\n'+self.getEntityName() + '('+self.getEntityId()+')';
				confirmed = confirm(confirmMessage);

				if (!confirmed) {
					return;
				}
				if(self.isNew() && !self.isRoot){
					return $scope.$emit('deletedDetailView', self);
				}
				return self
					.makeDeleteRequest()
					.then(function (data) {
						if(!self.isRoot){
							 $scope.$emit('deletedDetailView', self);
						}
						$scope.$emit('notification', {
								type      : 'success'
							, message   : 'web.backoffice.detail.deleteSuccess'
						});

						if (interactive) {
							return $state.go('app.list', {entityName: self.getEntityName() });
						}

						if(refreshView){
							$scope.$emit('reloadViewData');
						}

					}, function (err) {
						$scope.$emit('notification', {
							type      : 'error'
							, message   : 'web.backoffice.detail.deleteError'
							, variables : {
								errorMessage: err
							}
						});
						return $q.reject(err);
					});
			};


			/**
			 * Delete an entity
			 *
			 * todo: only delete the entity directly if it is a root entry, otherwise delegate it to the adapter!
			 */
			self.makeDeleteRequest = function () {
				if(self.isReadonly) return $q.when();
				console.log('DetailView: Make DELETE request');
				return APIWrapperService.request({
						url: self.getEntityUrl()
						, method: 'DELETE'
				});

			};

		}]);
})();
(function () {
    'use strict';

    /**
     * @notes: removed jQuery dependency, made the types injectable, did cleanup
     * @notes:  The directive triggers an additional compilation phase after it has gotten the options data, therefore
     *          the options are available within the sub components controllers. While this is necessary to render
     *          the content correctly, it also creates a fixed dependency between some components and the
     *          auto-form-element. The main problem is the fact that not all components need the same data. Further,
     *          some components require the option data to be able to register their selects.
     *
     */

    /**
     * Directive for autoFormElements: Replaces itself with the corresponding input element
     * as soon as the detailView directive has gotten the necessary data (type, required etc.)
     * from the server through an options call
     */
    var   typeKey = 'jb.formAutoInputTypes'
        , _module = angular.module('jb.formComponents');

    _module.value(typeKey, {
        'text'    : 'text'
        , 'number'  : 'text'
        , 'integer' : 'text'
        , 'decimal' : 'text'
        , 'interval': 'text'
        , 'string'  : 'text'
        , 'boolean' : 'checkbox'
        , 'datetime': 'date-time'
        , 'date'    : 'date-time'
        , 'time'    : 'date-time'
    });

    _module.directive('jbFormAutoInput', ['$compile', '$parse', function ($compile, $parse) {

        return {
              restrict          : 'E'
            , link : {
                post: function (scope, element, attrs, ctrl) {

                    var   readonlyGetter
                        , showLabelGetter
                        , hideElementGetter
                        , modelGetter;

                    ctrl.hasModel = attrs.hasOwnProperty('inputModel');
                    if(ctrl.hasModel){
                        modelGetter = $parse(attrs.inputModel);
                        scope.$watch(function(){
                                return modelGetter(scope.$parent);
                            },
                            function(newValue){
                                ctrl.inputModel = newValue;
                            });
                        scope.$watch(function(){
                            return ctrl.inputModel.value;
                        });
                    }

                    ctrl.hasLabel = attrs.hasOwnProperty('label');
                    if(ctrl.hasLabel){
                        attrs.$observe('label', function(newValue){
                            ctrl.label = newValue;
                        });
                    }
                    attrs.$observe('for', function(newValue){
                        ctrl.name = newValue;
                    });

                    if(attrs.hasOwnProperty('showLabel')){
                        showLabelGetter = $parse(attrs.showLabel);
                        scope.$watch(function(){
                            return showLabelGetter(scope.$parent)
                        }, function(value){
                            ctrl.showLabel = value;
                        });
                    }

                    if(attrs.hasOwnProperty('inputHidden')){
                        hideElementGetter = $parse(attrs.inputHidden);
                        scope.$watch(function(){
                            return hideElementGetter(scope.$parent)
                        }, function(value){
                            ctrl.inputHidden = value;
                        });
                    }

                    if(attrs.hasOwnProperty('isReadonly')){
                        readonlyGetter = $parse(attrs.isReadonly);
                        scope.$watch(function(){
                            return readonlyGetter(scope.$parent);
                        },  function(newValue){
                            ctrl.isReadonly = newValue;
                        });
                    }

                    ctrl.init(scope, element, attrs);
                }
                , pre: function (scope, element, attrs, ctrl) {
                    ctrl.preLink(scope, element, attrs);
                }
            }
            , controller        : 'JBFormAutoInputController'
            , scope             : true
        };
    }]);

    function JBFormAutoInputController($scope, $attrs, $compile, fieldTypes, subcomponentsService) {

        this.$scope     = $scope;
        this.$attrs     = $attrs;
        this.$compile   = $compile;
        this.fieldTypes = fieldTypes;

        this.name       = $attrs.for;
        this.label      = this.name;

        this.subcomponentsService   = subcomponentsService;
        this.registry               = null;
    }

    JBFormAutoInputController.prototype.preLink = function (scope, element, attrs) {
        this.registry = this.subcomponentsService.registryFor(scope);
        this.registry.listen();
    };

    JBFormAutoInputController.prototype.init = function (scope, element, attrs) {
        this.element = element;
        this.registry.registerOptionsDataHandler(this.updateElement.bind(this));
        this.registry.registerYourself();
    };
    // @todo: share this functionality with all the other literal inputs
    JBFormAutoInputController.prototype.selectOptions = function(optionsData){
        var properties = (optionsData) ? optionsData.properties : optionsData;
        if(!properties || !properties.length) return;
        for( var i = 0; i < properties.length; i++ ) {
            if(properties[i].name == this.name) return properties[i];
        }
        return;
    };

    /**
     * @todo: switch into an error state if there is no spec or corresponding type
     * @todo: think about a more angularish version of this procedure, since it is super messy!
     * @todo: remove the dependency to the controller name, since it couples the controller to the markup
     * @param fieldSpec
     */
    JBFormAutoInputController.prototype.updateElement = function(fieldSpec){

        var   elementType
            , elementSpec = this.selectOptions(fieldSpec)
            , elementTypeDashed
            , elementTypeTag
            , newElement;

        if (!elementSpec || !elementSpec.type) {
            console.error('AutoFormElement: fieldSpec %o has no type for field %o, elementSpec is %o', fieldSpec, this.name, elementSpec);
            return;
        }

        elementType = this.fieldTypes[elementSpec.type];

        if (!elementType) {
            console.error('AutoFormElement: Unknown type %o element %o', fieldSpec, this.element);
            return;
        }

        console.log('AutoFormElement: Create new %s from %o', elementType, fieldSpec);

        /**
         * Lets improve this by replacing the element and its attributes by the original.
         * The compiling will then resolve the values as they were before.
         */
        // camelCase to camel-case
        elementTypeDashed   = elementType.replace(/[A-Z]/g, function (v) { return '-' + v.toLowerCase(); });
        elementTypeTag      = 'jb-form-' + elementTypeDashed + '-input';
        newElement          = angular.element('<div>');

        newElement.attr(elementTypeTag  , '');
        newElement.attr('for'           , this.$attrs.for);
        newElement.attr('is-readonly'   , this.$attrs.isReadonly);
        newElement.attr('ng-hide'       , this.$attrs.inputHidden);

        if(this.hasLabel) newElement.attr('label'       , this.$attrs.label);
        if(this.hasModel) newElement.attr('input-model' , this.$attrs.inputModel);

        this.registry.unregisterOptionsDataHandler(this.updateElement);
        this.element.replaceWith(newElement);
        // if we do not replace the element, we might end up in a loop!
        this.$compile(newElement)(this.$scope);
        // now the registry should know all the subcomponents
        // delegate to the options data handlers of the components
        return this.registry.optionsDataHandler(fieldSpec);
    };

    _module.controller('JBFormAutoInputController', [
        '$scope',
        '$attrs',
        '$compile',
        typeKey,
        'JBFormComponentsService',
        JBFormAutoInputController ]);
})();


(function (undefined) {
    'use strict';

    /**
     * Auto checkbox input.
     */

    var JBFormCheckboxInputController = function (componentsService) {
        this.subcomponentsService = componentsService;
    };

    JBFormCheckboxInputController.prototype.updateData = function (data) {
        this.setValue(data[this.name]);
        this.originalData = this.getValue();
    };

    JBFormCheckboxInputController.prototype.setValue = function(value){
        if(!this.hasModel) this.model = {};
        this.model.value = value;
    };

    JBFormCheckboxInputController.prototype.getValue = function(){
        return (this.model || {}).value;
    };

    JBFormCheckboxInputController.prototype.getSelectFields = function(){
        return [this.name];
    };

    JBFormCheckboxInputController.prototype.getSaveCalls = function () {
        if (this.originalData === this.getValue() || this.isReadonly) return [];

        var data = {};
        data[this.name] = this.getValue() === true;
        return [{
            data: data
        }];
    };

    JBFormCheckboxInputController.prototype.preLink = function (scope, element, attrs) {
    };

    JBFormCheckboxInputController.prototype.isValid = function () {
        return true;
    };

    JBFormCheckboxInputController.prototype.isRequired = function(){
        return false;
    };

    JBFormCheckboxInputController.prototype.registerAt = function (parent) {
        parent.registerGetDataHandler(this.updateData.bind(this));
    };

    JBFormCheckboxInputController.prototype.unregisterAt = function (parent) {
        parent.unregisterGetDataHandler(this.updateData);
    };

    JBFormCheckboxInputController.prototype.init = function (scope, element, attrs) {
        this.subcomponentsService.registerComponent(scope, this);
        if(angular.isUndefined(this.showLabel)){
            this.showLabel = true;
        }
    };

    JBFormCheckboxInputController.prototype.displayLabel = function(){
        return this.hasLabel && this.showLabel !== false;
    };

    var _module = angular.module('jb.formComponents');
    _module.directive('jbFormCheckboxInput', [function () {

        return {
            scope : {

                  name        : '@for'
                , isReadonly  : '<?'
                , label       : '@?'
                , showLabel   : '<?'
                , model       : '=?inputModel'
            }
            , controller        : 'JBFormCheckboxInputController'
            , bindToController  : true
            , controllerAs      : '$ctrl'
            , link: {
                pre: function (scope, element, attrs, ctrl) {
                    ctrl.preLink(scope, element, attrs, ctrl);
                }
                , post: function (scope, element, attrs, ctrl) {
                    ctrl.hasLabel = attrs.hasOwnProperty('label');
                    ctrl.hasModel = attrs.hasOwnProperty('inputModel');
                    ctrl.init(scope, element, attrs);
                }
            }
            , template:
                '<div class="form-group">' +
                    '<label ng-if="$ctrl.displayLabel()" ' +
                            'jb-form-label-component ' +
                            'label-identifier="{{$ctrl.label}}" ' +
                            'is-valid="$ctrl.isValid()" ' +
                            'is-required="$ctr.isRequired()">' +
                    '</label>' +
                    '<div ng-class="{ \'col-md-9\' : $ctrl.displayLabel(), \'col-md-12\' : !$ctrl.displayLabel() }">' +
                        '<div class="checkbox">' +
                            '<input type="checkbox" data-ng-model="$ctrl.model.value"/>' +
                        '</div>' +
                    '</div>' +
                '</div>'
        };

    }]);

    _module.controller('JBFormCheckboxInputController', [
        'JBFormComponentsService',
        JBFormCheckboxInputController]);
})();
(function (undefined) {


    'use strict';

    function pad(nr) {
        return nr < 10 ? '0' + nr : nr;
    }

    function JBFormDateTimeInputController(componentsService) {

        this.subcomponentsService   = componentsService;
        this.originalData = undefined;
        this.required = true;
        this.spec = null;

    }

    JBFormDateTimeInputController.prototype.getSelectFields = function(){
        return [this.name];
    };

    JBFormDateTimeInputController.prototype.isRequired = function () {
        return this.required === true;
    };

    JBFormDateTimeInputController.prototype.isValid = function () {
        var value = this.getValue();
        if(this.isRequired() && !this.isReadonly) return !!value && !isNaN(value.getTime());
        return true;
    };

    JBFormDateTimeInputController.prototype.setValue = function(value) {
        if(!this.model) this.model = {};
        this.model.value = value;
    };

    JBFormDateTimeInputController.prototype.getValue = function() {
        return (this.model || {}).value;
    };

    JBFormDateTimeInputController.prototype.updateData = function (data) {
        var dateValue = this.normalizeValue(data[this.name]);
        this.setValue(dateValue);
        this.originalData = this.getValue();
    };

    JBFormDateTimeInputController.prototype.normalizeValue = function(value){
      if(!value) return value;
      if(this.isTimeOnly()){
        var segments = value.split(':');
        var date = new Date();
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setHours(segments[0]);
        date.setMinutes(segments[1]);
        return date;
      }
      return new Date(value);
    };

    JBFormDateTimeInputController.prototype.isTimeOnly = function() {
      return this.spec && this.spec.type === 'time';
    };

    JBFormDateTimeInputController.prototype.getSaveCalls = function () {

        var   currentDate   = this.getValue()
            , originalDate  = this.originalData
            , call          = { data: {}}
            , dateString    = ''
            , timeString    = '';

        // No date set
        if (!currentDate && !originalDate) return [];
        // Dates are the same
        if (currentDate && originalDate && currentDate.getTime() == originalDate.getTime()) return [];
        // a new date was set
        if (currentDate) {
            if(!this.isTimeOnly()){
              dateString = [
                    currentDate.getFullYear()
                  , pad(currentDate.getMonth() + 1)
                  , pad(currentDate.getDate())
              ].join('-')
            }

            timeString = [
                pad(currentDate.getHours())
              , pad(currentDate.getMinutes())
              , pad(currentDate.getSeconds())
            ].join(':')
        } // else, date was deleted
        call.data[this.name] = dateString+' '+timeString;
        return [call];
    };

    JBFormDateTimeInputController.prototype.init = function (scope) {
        this.subcomponentsService.registerComponent(scope, this);
    };

    JBFormDateTimeInputController.prototype.displayLabel = function(){
        return this.hasLabel && this.showLabel !== false;
    };

    JBFormDateTimeInputController.prototype.registerAt = function (parent) {
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
        parent.registerGetDataHandler(this.updateData.bind(this));
    };

    JBFormDateTimeInputController.prototype.unregisterAt = function (parent) {
        parent.unregisterOptionsDataHandler(this.handleOptionsData);
        parent.unregisterGetDataHandler(this.updateData);
    };

    /**
    * Get spec for current element from options data
    */
    JBFormDateTimeInputController.prototype.selectSpec = function(data){
        var properties = (data && data.properties) ? data.properties : [];
        if(!properties.length) return ;
        for(var i=0; i<properties.length; i++){
            var property = properties[i];
            if(property.name === this.name) return property;
        }
    };

    JBFormDateTimeInputController.prototype.handleOptionsData = function (data) {
        var spec = this.selectSpec(data);

        if (!spec) return console.error('JBFormDateTimeInputController: No field spec for %o', this.name);

        this.spec       = spec;
        this.required   = spec.nullable === false;
        this.isReadonly = this.isReadonly === true || spec.readonly === true;

        this.showDate       = spec.type !== 'time';
        this.showTime       = spec.type === 'datetime' || spec.type === 'time';
        //this.showDate = true;
        //this.showTime = true;
    };

    var _module = angular.module('jb.formComponents');
    _module.directive('jbFormDateTimeInput', [function () {
        return {
              scope : {
                    name        : '@for'
                  , label       : '@?'
                  , showLabel   : '<?'
                  , isReadonly  : '<?'
                  , model       : '=?inputModel'
              }
            , controller        : 'JBFormDateTimeInputController'
            , bindToController  : true
            , controllerAs      : '$ctrl'
            , link: function (scope, element, attrs, ctrl) {
                  ctrl.hasLabel = attrs.hasOwnProperty('label');
                  ctrl.hasModel = attrs.hasOwnProperty('inputModel');
                  ctrl.init(scope, element, attrs);
            }
            , template:
                '<div class="form-group form-group-sm jb-form-date-time-input" ng-class="{\'invalid\' : !$ctrl.isValid()}">' +
                    '<label ng-if="$ctrl.displayLabel()" jb-form-label-component label-identifier="{{$ctrl.label}}" is-required="$ctrl.isRequired()" is-valid="$ctrl.isValid()"></label>' +
                    '<div ng-class="{\'col-md-9\' : $ctrl.displayLabel(), \'col-md-12\': !ctrl.displayLabel() }">' +
                        '<div class="row">' +
                            '<div ng-if="$ctrl.showDate" ng-class="{ \'col-md-6\': $ctrl.showTime, \'col-md-12\': !$ctrl.showTime }">' +
                                '<input type="date" class="form-control input-sm input-date" data-ng-model="$ctrl.model.value" ng-disabled="$ctrl.isReadonly">' +
                            '</div>' +
                            '<div ng-if="$ctrl.showTime" ng-class="{ \'col-md-6\': $ctrl.showDate, \'col-md-12\': !$ctrl.showDate }">' +
                                '<input type="time" class="form-control input-sm input-time" data-ng-model="$ctrl.model.value" ng-disabled="$ctrl.isReadonly"/>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>'
        };

    }]);

    _module.controller(
          'JBFormDateTimeInputController'
        , [
              'JBFormComponentsService'
            , JBFormDateTimeInputController
        ]);

})();
(function(undefined){

/**
 * Hidden input. Used to
 * - add select statements to detailView (use for attribute)
 * - store hidden fields in detailView
 *
 * Pass
 * - data-read="expression" to only read data if a certain condition is met or
 * - data-write="expression" to only write data if a certain condition is met
 * Default for both (if not passed) is true. Evals against $scope.$parent.
 */

'use strict';

angular
    .module('jb.backofficeHiddenInput', [])

/**
 * Directive for an autoFormElement of type 'text'
 */
    .directive('hiddenInput', [function () {

        return {
              controller: 'HiddenInputController'
            , link: function (scope, element, attrs, ctrl) {
                ctrl.init(scope, element, attrs, ctrl);
            }
            // Let the user get stuff from the $parent scope to use
            // as value
            , scope: true
        };
    }])

    .controller('HiddenInputController', [
        '$scope'
        , '$attrs'
        , 'JBFormComponentsService'
        , function ($scope, $attrs, componentsService) {

            var self = this
                , element
                , detailViewController;

            self.init = function (scope, el, attrs) {
                element = el;
                componentsService.registerComponent(scope, self);
            };

            self.isValid = function () { return true; };
            self.registerAt = function(parent) {  };

            // Purpose 1: let user select any field passed through for
            // If the elemen's data-read attribute evals to false, don't add the for
            // attribute to the select statement.
            // This is e.g required for nested sets where we need to *set* «parentNode» or «after» or «before»,
            // but can't select those properties because they're virtual.
            console.log('HiddenInput: for is %o, read %o (hasProperty %o) evals to %o', $attrs.for, $attrs.read, $attrs.hasOwnProperty('read'), $scope.$parent.$eval($attrs.read));

            self.getSelectFields = function () {
                if (!$attrs.hasOwnProperty('read') || $scope.$parent.$eval($attrs.read)) return [$attrs.for];
                return [];
            };


            // Purpose 2: Store hidden values
            self.getSaveCalls = function () {

                var writeData = !$attrs.hasOwnProperty('write') || $scope.$parent.$eval($attrs.write);

                console.log('HiddenInput: Get save calls; $attrs.data is %o, writeData is %o, data-write is %o and evals to %o', $attrs.data, writeData, $attrs.write, $scope.$parent.$eval($attrs.write));

                if (writeData && $attrs.data) {

                    var isRelation = $attrs.for && $attrs.for.indexOf('.') > -1;

                    // If there's a star in the for attribute, we're working with a relation.
                    // Store it through POSTing to /entity/id/entity/id instead of sending data.
                    // If you should ever change this behaviour, make sure that you can still edit
                    // discounts on articles in the Cornèrcard back office.
                    if (isRelation) {

                        var entityName = $attrs.for.substring(0, $attrs.for.lastIndexOf('.'))
                            , url = entityName + '/' + $attrs.data;

                        console.log('HiddenInput: Store relation %o', url);

                        return {
                            url: url
                            , method: 'POST'
                        };


                    }
                    else {

                        // Compose data
                        var saveData = {};
                        saveData[$attrs.for] = $attrs.data;

                        console.log('HiddenInput: Store data %o', saveData);

                        return {
                            //url: ''
                            data: saveData
                            // Method: PATCH if entity already has an ID, else POST
                            //, method: detailViewController.getEntityId() ? 'PATCH' : 'POST'
                        };

                    }

                }

                return [];

            };


        }]);
})();
(function(undefined) {
    
    'use strict';

    var JBFormIntervalInputController = function ($scope, $attrs, $q, componentsService) {

        this.$scope     = $scope;
        this.$attrs     = $attrs;
        this.$q         = $q;
        this.componentsService  = componentsService;
        this.originalData       = undefined;
        this.required           = true;

    };

    JBFormIntervalInputController.prototype.isRequired = function(){
        return this.required === true;
    };

    JBFormIntervalInputController.prototype.isValid = function () {
        if(this.isRequired() && !this.isReadonly) return !!this.getValue();
        return true;
    };

    JBFormIntervalInputController.prototype.registerAt = function(parent){
        parent.registerGetDataHandler(this.updateData.bind(this));
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
    };

    JBFormIntervalInputController.prototype.unregisterAt = function(parent){
        parent.unregisterGetDataHandler(this.updateData.bind(this));
        parent.unregisterOptionsDataHandler(this.handleOptionsData.bind(this));
    };

    JBFormIntervalInputController.prototype.selectOptions = function(optionsData){
        var properties = (optionsData) ? optionsData.properties : optionsData;
        if(!properties || !properties.length) return;
        return properties.filter(function(property) { return property.name === this.name; }.bind(this))[0];
    };
    /**
     * @todo: switch into an error state
     * @param data
     */
    JBFormIntervalInputController.prototype.handleOptionsData = function(data){
        var spec = this.selectOptions(data);
        if(!angular.isDefined(spec)) return console.error('No options data available for interval field %o', this.name);
        this.options    = spec;
        this.required   = spec.nullable === false;
        this.isReadonly = this.isReadonly === true || spec.readonly === true;
    };

    JBFormIntervalInputController.prototype.getValue = function(){
        return (this.model || {}).value;
    };

    JBFormIntervalInputController.prototype.setValue = function(value){
        if(!this.model) this.model = {};
        this.model.value = value;
    };

    JBFormIntervalInputController.prototype.init = function (scope, element, attrs) {
        this.componentsService.registerComponent(scope, this);
        if(angular.isUndefined(this.showLabel)){
            this.showLabel = true;
        }
    };

    JBFormIntervalInputController.prototype.preLink = function (scope) {
    };

    JBFormIntervalInputController.prototype.getSelectFields = function(){
        return [this.name];
    };

    JBFormIntervalInputController.prototype.updateData = function (data) {
        this.originalData = this.getValue();
        var fieldData = data[this.name];
        if (!fieldData) {
        	this.setValue('');
        	return;
        }
        // Convert data from server to string (which may be saved):
        // { days: 2, minutes: 4 } becomes "2 days 4 minutes"
        var valueString = Object.keys(fieldData).reduce(function(previous, current) {
        	return previous + fieldData[current] + ' ' + current + ' ';
        }, '').trim();
        this.setValue(valueString);
    };

    JBFormIntervalInputController.prototype.displayLabel = function(){
        return this.hasLabel && this.showLabel !== false;
    };

    JBFormIntervalInputController.prototype.getSaveCalls = function () {

    	// originalData may be undefined, while getValue is '' – no change, therefore don't
    	// store anything.
    	if (this.originalData === undefined && !this.getValue()) return [];

        if (this.originalData === this.getValue() || this.isReadonly) return [];

        var data = {};
        data[this.name] = this.getValue();

        return [{
            data: data
        }];
    };

    var _module = angular.module('jb.formComponents');
        _module.controller('JBFormIntervalInputController', [
            '$scope' ,
            '$attrs' ,
            '$q' ,
            'JBFormComponentsService' ,
            JBFormIntervalInputController]);

    /**
     * Directive for an autoFormElement for interval (see postgres docs)
     */
        _module.directive('jbFormIntervalInput', [function () {

            return {
                  scope : {
                        name        : '@for'
                      , label       : '@?'
                      , isReadonly  : '<?'
                      , showLabel   : '<?'
                      , model       : '=?inputModel'
                  }
                , controllerAs      : '$ctrl'
                , bindToController  : true
                , link: {
                    post: function (scope, element, attrs, ctrl) {
                        ctrl.model          = {};
                        ctrl.hasInputModel  = attrs.hasOwnProperty('inputModel');
                        ctrl.hasLabel       = attrs.hasOwnProperty('label');
                        ctrl.init(scope, element, attrs);
                    }
                    , pre: function(scope, element, attrs, ctrl){
                        ctrl.preLink(scope, element, attrs);
                    }
                }
                , controller: 'JBFormIntervalInputController'
                , template: '<div class="form-group form-group-sm"> ' +
                                '<label ng-if="$ctrl.displayLabel()" jb-form-label-component label-identifier="{{$ctrl.label}}" is-valid="$ctrl.isValid()" is-required="$ctrl.isRequired()"></label> ' +
                                '<div ng-class="{ \'col-md-9\' : $ctrl.displayLabel(), \'col-md-12\' : !$ctrl.displayLabel() }" > ' +
                                    '<input type="text" ' +
                                            'ng-attr-id="$ctrl.name" ' +
                                            'ng-attrs-required="$ctrl.isRequired()" ' +
                                            'ng-model="$ctrl.model.value" ' +
                                            'ng-disabled="$ctrl.isReadonly" ' +
                                            'class="form-control input-sm" />' +
                                '</div> ' +
                            '</div> '
            };

        }]);
})();
(function(undefined) {
    'use strict';

    var JBFormTextInputController = function ($scope, $attrs, $q, componentsService) {

        this.$scope     = $scope;
        this.$attrs     = $attrs;
        this.$q         = $q;
        this.componentsService  = componentsService;
        this.originalData       = undefined;
        this.required           = true;

        this.options;
    };

    JBFormTextInputController.prototype.isRequired = function(){
        return this.required === true;
    };

    /**
     * @todo: check if the readonly property should influence the behavior
     * @returns {boolean}
     */
    JBFormTextInputController.prototype.isValid = function () {
        if(this.isRequired() && !this.isReadonly) return !!this.getValue();
        return true;
    };

    JBFormTextInputController.prototype.registerAt = function(parent){
        parent.registerGetDataHandler(this.updateData.bind(this));
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
    };

    JBFormTextInputController.prototype.unregisterAt = function(parent){
        parent.unregisterGetDataHandler(this.updateData.bind(this));
        parent.unregisterOptionsDataHandler(this.handleOptionsData.bind(this));
    };

    JBFormTextInputController.prototype.selectOptions = function(optionsData){
        var properties = (optionsData) ? optionsData.properties : optionsData;
        if(!properties || !properties.length) return;
        for( var i = 0; i < properties.length; i++ ) {
            if(properties[i].name == this.name) return properties[i];
        }
    };
    /**
     * @todo: switch into an error state
     * @param data
     */
    JBFormTextInputController.prototype.handleOptionsData = function(data){
        var spec = this.selectOptions(data);
        if(!angular.isDefined(spec)) return console.error('No options data available for text-field %o', this.name);
        this.options    = spec;
        this.required   = spec.nullable === false;
        this.isReadonly = this.isReadonly === true || spec.readonly === true;
    };

    JBFormTextInputController.prototype.getValue = function(){
        return (this.model || {}).value;
    };

    JBFormTextInputController.prototype.setValue = function(value){
        if(!this.model) this.model = {};
        this.model.value = value;
    };

    JBFormTextInputController.prototype.init = function (scope, element, attrs) {
        this.componentsService.registerComponent(scope, this);
        if(angular.isUndefined(this.showLabel)){
            this.showLabel = true;
        }
    };

    JBFormTextInputController.prototype.preLink = function (scope) {
    };

    JBFormTextInputController.prototype.getSelectFields = function(){
        return [this.name];
    };

    JBFormTextInputController.prototype.updateData = function (data) {
        this.originalData = this.getValue();
        this.setValue(data ? data[this.name] : data);
    };

    JBFormTextInputController.prototype.displayLabel = function(){
        return this.hasLabel && this.showLabel !== false;
    };

    JBFormTextInputController.prototype.getSaveCalls = function () {

        if (this.originalData === this.getValue() || this.isReadonly) return [];

        var data = {};
        data[this.name] = this.getValue();

        return [{
            data: data
        }];
    };

    var _module = angular.module('jb.formComponents');
        _module.controller('JBFormTextInputController', [
            '$scope' ,
            '$attrs' ,
            '$q' ,
            'JBFormComponentsService' ,
            JBFormTextInputController]);

    /**
     * Directive for an autoFormElement of type 'text'
     */
        _module.directive('jbFormTextInput', [function () {

            return {
                  scope : {
                        name        : '@for'
                      , label       : '@?'
                      , isReadonly  : '<?'
                      , showLabel   : '<?'
                      , model       : '=?inputModel'
                  }
                , controllerAs      : '$ctrl'
                , bindToController  : true
                , link: {
                    post: function (scope, element, attrs, ctrl) {
                        ctrl.model          = {};
                        ctrl.hasInputModel  = attrs.hasOwnProperty('inputModel');
                        ctrl.hasLabel       = attrs.hasOwnProperty('label');
                        ctrl.init(scope, element, attrs);
                    }
                    , pre: function(scope, element, attrs, ctrl){
                        ctrl.preLink(scope, element, attrs);
                    }
                }
                , controller: 'JBFormTextInputController'
                , template: '<div class="form-group form-group-sm"> ' +
                                '<label ng-if="$ctrl.displayLabel()" jb-form-label-component label-identifier="{{$ctrl.label}}" is-valid="$ctrl.isValid()" is-required="$ctrl.isRequired()"></label> ' +
                                '<div ng-class="{ \'col-md-9\' : $ctrl.displayLabel(), \'col-md-12\' : !$ctrl.displayLabel() }" > ' +
                                    '<input type="text" ' +
                                            'ng-attr-id="$ctrl.name" ' +
                                            'ng-attrs-required="$ctrl.isRequired()" ' +
                                            'ng-model="$ctrl.model.value" ' +
                                            'ng-disabled="$ctrl.isReadonly" ' +
                                            'class="form-control input-sm" />' +
                                '</div> ' +
                            '</div> '
            };

        }]);
})();
/**
* Angular directive that accepts file drops:
* - Adds the file to the model
* - Adds classes .drop-over, .dropped (2s)
* - Holds a (hidden) file upload button
*/

angular
.module( 'jb.fileDropComponent', [] )
.directive( 'fileDropComponent', [ function() {

	return {
		require				: [ 'fileDropComponent' ]
		, controller		: 'FileDropComponentController'
		, controllerAs		: 'fileDropComponent'
		, bindToController	: true
		, link				: function( scope, element, attrs, ctrl ) {
			ctrl[ 0 ].init( element );
		}
		, scope: {
			'supportedFileTypes'			: '='
			// Array the file data is pushed to
			, 'files'						: '=model'
			// Function that handles errors. Is called with 
			// an Error object. The argument passed must be called
			// «error»: 
			// data-error-handler="errorFn(error)"
			, 'errorHandler'				: '&'
			, 'maxFileCount'				: '@' // To be implemented.
		}
	};

} ] )

.controller( 'FileDropComponentController', [ '$scope', function( $scope ) {

	var self = this
		, _element;

	self.files = [];

	// undefined
	// hover
	// dropped
	self.state = 'undefined';


	self.init = function( el, detailViewCtrl ) {

		_element = el;
		_setupDragDropListeners();

		_addFileInputChangeListener();

	};




	/////////////////////////////////////////////////////////////////////////////////
	//
	// ERROR HANDLER
	//

	/**
	* Call the error-handler function with an error.
	*/
	function _throwError( err ) {

		if( self.errorHandler && angular.isFunction( self.errorHandler ) ) {
			self.errorHandler( { error: err } );
		}

	}



	/////////////////////////////////////////////////////////////////////////////////
	//
	// HTML5 d'n'd Stuff
	//
	
	function _setupDragDropListeners() {

		_element
			.bind( 'drop', _dropHandler )
			.bind( 'dragover', _dragOverHandler )
			.bind( 'dragenter', _dragOverHandler )
			.bind( 'dragleave', _dragLeaveHandler );

	}

	function _dragOverHandler( ev ) {
		ev.preventDefault();
		// Doesn't work yet. Probably needs a shared scope as we're 
		// using it in nested directives.
		/*$scope.$apply( function() {
			self.state = 'hover';
		} );*/
		ev.originalEvent.dataTransfer.effectAllowed = 'copy';
		return false;
	}


	function _dropHandler( ev ) {
		ev.preventDefault();
		var files = ev.originalEvent.dataTransfer.files;
		_handleFiles( files );
		return false;
	}


	function _dragLeaveHandler( ev ) {
		/*$scope.$apply( function() {
			self.state = undefined;
		} );*/
	}





	/////////////////////////////////////////////////////////////////////////////////
	//
	// INPUT[type=file] STUFF
	//


	/**
	* If there's an input[type=file], handle it's change event.
	*/
	function _addFileInputChangeListener() {

		_element
			.find( 'input[type=\'file\']' )
			.change( function( ev ) {

				if( !ev.target.files || !ev.target.files.length ) {
					console.log( 'BackofficeImageComponentController: files field on ev.target missing: %o', ev.target );
					return;
				}

				_handleFiles( ev.target.files );

			} );

	}





	/////////////////////////////////////////////////////////////////////////////////
	//
	// HTML5 FILE stuff
	//

	/**
	* Handles files in a JS fileList
	*/
	function _handleFiles( files ) {

		var invalidFiles = [];

		// files is not an array, cannot use forEach
		for( var i = 0; i < files.length; i++ ) {

			var file = files[ i ];

			if( _checkFileType( file ) ) {
				_readFile( file );
			}
			else {
				invalidFiles.push( file.name );
			}

		}

		// Inalid files detected: 
		// - console.warn
		// - call error callback function with new error
		if( invalidFiles.length ) {
			console.warn( 'FileDropComponentController: Invalid file ', JSON.stringify( invalidFiles ) );
			_throwError( new Error( 'Tried to upload files with invalid file type: ' + invalidFiles.join( ', ' ) + '. Allowed are ' + self.supportedFileTypes.join( ', ' ) ) + '.' );
		}

	}



	/**
	* Check if file type of dropped file is in self.supportedFileTypes.
	*/
	function _checkFileType( file ) {

		if( !self.supportedFileTypes || !angular.isArray( self.supportedFileTypes ) ) {
			return true;
		}

		return self.supportedFileTypes.indexOf( file.type ) > -1;

	}



	/**
	* Read file, add to self.files.
	*/
	function _readFile( file ) {

		var fileReader = new FileReader();

		// Add file data to self.files on load
		fileReader.onload = function( loadEv ) {


			var imageSize
				, fileData = {
					file		: file
					, fileSize	: file.size
					, mimeType	: file.type
					, height	: undefined
					, width		: undefined
					, fileData 	: loadEv.target.result
			};



			// Try to get dimensions if it's an image
			try {

				var image = new Image();
				image.src = fileReader.result;
				image.onload = function() {

					var imageScope = this;

					$scope.$apply( function() {
						fileData.width = imageScope.width;
						fileData.height = imageScope.height;
					} );

				};

			}
			catch( e ) {
				console.error( 'FileDropComponentController: Error reading file: %o', e );
			}


			// Read file ( to display preview)
			$scope.$apply( function() {

				self.files.push( fileData );
	
			} );

		};

		fileReader.readAsDataURL( file );

	}





} ] );
/***
* Component for data (JSON) property
*/
( function() {

	'use strict';

	angular

	.module( 'jb.formComponents' )

	.directive( 'jbFormDataComponent', [ function() {

		return {
			require				: [ 'backofficeDataComponent', '^detailView' ]
			, controller		: 'JBFormDataComponentController'
			, controllerAs		: 'backofficeDataComponent'
			, bindToController	: true
			, templateUrl		: 'backofficeDataComponentTemplate.html'
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl[ 0 ].init( element, ctrl[ 1 ] );
			}
			, scope: {
				'propertyName'		: '@for'
				, 'fields'			: '='
			}

		};

	} ] )

	.controller( 'JBFormDataComponentController', [ '$scope', '$rootScope', '$q', 'APIWrapperService', function( $scope, $rootScope, $q, APIWrapperService ) {

		var self = this
			, _element
			, _detailViewController

			, _originalData = {}; // If no data is available at all, use {}

		self.init = function( el, detailViewCtrl ) {

			_element = el;
			_detailViewController = detailViewCtrl;

			_detailViewController.registerOptionsDataHandler( self.updateOptionsData );
			_detailViewController.registerGetDataHandler( self.updateData );

		};



		/**
		* Check if fields variable passed is valid. Returns true if no error was detected, else throws an error.
		*/
		self.checkFields = function() {

			if( !angular.isArray( self.fields ) ) {
				throw new Error( 'JBFormDataComponentController: fields passed is not an array: ' + JSON.stringify( self.fields ) );
			}


			self.fields.forEach( function( field ) {

				if( !angular.isObject( field ) ) {
					throw new Error( 'JBFormDataComponentController: field passed is not an object: ' + JSON.stringify( field ) );
				}

				if( !field.name ) {
					throw new Error( 'JBFormDataComponentController: field is missing name property: ' + JSON.stringify( field ) );
				}

			} );

			return true;

		};




		/**
		* Called with GET data
		*/
		self.updateData = function( data ) {

			if( !self.checkFields() ) {
				return;
			}

			if( data[ self.propertyName ] ) {

				// Use {} as default to prevent errors if reading properties from undefined
				try {

					// When data is set
					if( angular.isString( data[ self.propertyName ] ) ) {
						_originalData = JSON.parse( data[ self.propertyName ] );
					}
					// When data is empty, [object Object] is returned as string
					else if( angular.isObject( data[ self.propertyName ] ) ) {
						_originalData = angular.copy( data[ self.propertyName ] );
					}
					else if( !data[ self.propertyName ] ) {
						_originalData = {};
					}

				} catch( err ) {
					console.error( 'JBFormDataComponentController: Could not parse data ' + data[ self.propertyName ] );					
				}

			}


			// Set selected
			self.fields.forEach( function( field ) {

				// Add option to remove data
				if( field.values.indexOf( undefined ) === -1 ) {
					field.values.push( undefined );
				}

				// Set selected on field
				if( _originalData[ field.name ] ) {
					field.selected = _originalData[ field.name ];
				}

			} );

		};




		/**
		* Called with OPTIONS data 
		*/
		self.updateOptionsData = function( data ) {

			if( !data[ self.propertyName ] ) {
				console.error( 'JBFormDataComponentController: Missing OPTIONS data for %o in %o', self.propertyName, data );
				return;
			}

			_detailViewController.register( self );

		};



		/**
		* Returns the fields that need to be selected on the GET call
		*/
		self.getSelectFields = function() {

			return [ self.propertyName ];

		};




		/**
		* Store/Delete files that changed.
		*/
		self.getSaveCalls = function() {


			// No changes
			var changed = false;
			self.fields.forEach( function( field ) {
				if( _originalData[ field.name ] !== field.selected ) {
					changed = true;
				}
			} );

			if( !changed ) {
				console.log( 'JBFormDataComponentController: No changes made.' );
				return false;
			}

			var ret = _originalData ? angular.copy( _originalData ) : {};

			// Take ret and make necessary modifications.
			self.fields.forEach( function( field ) {

				// Value deleted
				if( field.selected === undefined && ret[ field.name ] ) {
					delete ret[ field.name ];
				}

				// Update value
				else {

					// Don't store empty fields (if newly created; if they existed before, 
					// they were deleted 5 lines above)
					if( field.selected !== undefined ) {
						ret[ field.name ] = field.selected;
					}

				}

			} );

			console.log( 'JBFormDataComponentController: Store changes %o', ret );

			return {
				data	: {
					// Write on the data field
					data: JSON.stringify( ret )
				}
			};

		};


	} ] )



	.run( [ '$templateCache', function( $templateCache ) {

		$templateCache.put( 'backofficeDataComponentTemplate.html',
			'<div class=\'form-group form-group-sm\' data-ng-repeat="field in backofficeDataComponent.fields">' +
				//'{{ field | json }}' +
				'<label data-backoffice-label data-label-identifier=\'{{field.name}}\' data-is-required=\'false\' data-is-valid=\'true\'></label>' +
				'<div class=\'col-md-8\'>' +
					'<select class=\'form-control\' data-ng-options=\'value for value in field.values\' data-ng-model=\'field.selected\'></select>' +
				'</div>' +
				'<div class=\'col-md-1\'>' + 

				'</div>' +
			'</div>'
		);

	} ] );


} )();


/***
* Media group component: Displays videos and images in a list that may be sorted 
* by drag-and-drop.
*/
( function() {

	'use strict';

	var _module = angular.module( 'jb.formComponents' )

	.directive( 'jbFormMediaGroupComponent', [ function() {

		return {
			require				: [ 'backofficeMediaGroupComponent', '^detailView' ]
			, controller		: 'JBFormMediaGroupComponentController'
			, controllerAs		: 'backofficeMediaGroupComponent'
			, bindToController	: true
			, templateUrl		: 'backofficeMediaGroupComponentTemplate.html'
			, link				: function( scope, element, attrs, ctrl ) {
				ctrl[ 0 ].init( element, ctrl[ 1 ] );
			}
			, scope: {
				'propertyName'		: '@for'
			}

		};

	} ] )

	.controller( 'JBFormMediaGroupComponentController', [ '$scope', '$rootScope', '$q', 'APIWrapperService', function( $scope, $rootScope, $q, APIWrapperService ) {

		var self = this
			, _element
			, _detailViewController

			, _originalData = []

			, _selectFields = [ '*', 'video.*', 'video.videoType.*', 'image.*', 'mediumGroup_medium.*', 'mediumGroup.*' ];


		self.media = [];


		/**
		* Model that the relation-input («add medium») is bound to. 
		* Watch it to see what new medium is added; after change, remove it's items – should
		* therefore always have a length of 0 or 1. 
		*/
		self.addMediumModel = [];



		self.init = function( el, detailViewCtrl ) {

			_element = el;
			_detailViewController = detailViewCtrl;

			_detailViewController.registerOptionsDataHandler( self.updateOptionsData );
			_detailViewController.registerGetDataHandler( self.updateData );

			self.setupAddMediumModelWatcher();

			self.setupOrderChangeListener();

		};


		/**
		* Sort media by their sortOrder (stored on mediumGroup_medium[0].sortOrder)
		*/
		function sortMedia( a, b ) {

			var aOrder 		= a.mediumGroup_medium[ 0 ].sortOrder
				, bOrder 	= b.mediumGroup_medium[ 0 ].sortOrder;

			return aOrder < bOrder ? -1 : 1;

		}



		/**
		* Called with GET data
		*/
		self.updateData = function( data ) {
			
			if( data[ self.propertyName ] ) {

				var media 		= data[ self.propertyName ] || [];

				try {
					self.media = media.sort( sortMedia );
				} catch( err ) {
					console.error( 'JBFormMediaGroupComponentController: Properties mediumGroup_medium, it\'s items or sortOrder missing' );
					self.media = media;
				}

				_originalData 	= angular.copy( self.media );

			}

		};




		/**
		* Listen to orderChange events that are fired on the lis through the drag-droplist directive, 
		* update array/model accordingly.
		*/
		self.setupOrderChangeListener = function() {

			// Called whenever drag-drop-list directive causes the order to change. 
			// Re-order the media array.
			_element[ 0 ].addEventListener( 'orderChange', function( ev ) {

				self.media.splice( ev.detail.newOrder, 0, self.media.splice( ev.detail.oldOrder, 1 )[ 0 ] );

			} );

		};




		/**
		* Watch for changes on addMediumModel. When data is added,
		* add it to self.media.
		*/
		self.setupAddMediumModelWatcher = function() {

			$scope.$watch( function() {
				return self.addMediumModel;
			}, function( newVal ) {

				if( self.addMediumModel.length === 1 ) {

					self.addMedium( newVal[ 0 ].id );

					// Re-set model
					self.addMediumModel = [];					
				}

			}, true );

		};


		/**
		* Adds a medium to self.media (is the de-facto click handler for
		* the add medium dropdown).
		*/
		self.addMedium = function( mediumId ) {

			// Check for duplicates
			if( 
				self.media.filter( function( item ) {
					return item.id === mediumId;
				} ).length > 0 
			) {
				console.error( 'JBFormMediaGroupComponentController: Trying to add duplicate with id', mediumId );
				return;
			}

			APIWrapperService.request( {
				url				: '/' + self.propertyName + '/' + mediumId
				, method		: 'GET'
				, headers		: {
					select		: self.getSelectFields()
				}
			} )
			.then( function( data ) {
				
				self.media.push( data );

			}, function( err ) {

				console.error( 'JBFormMediaGroupComponentController: Could not get data for medium with id %o: %o', mediumId, err );

				$rootScope.$broadcast( 'notification', {
					'type'		: 'error'
					, 'message'	: 'web.backoffice.detail.loadingError'
					, variables	: {
						errorMessage: err
					}
				} );

			} );


		};



		/**
		* Called with OPTIONS data 
		*/
		self.updateOptionsData = function( data ) {

			_detailViewController.register( self );

		};



		/**
		* Returns the fields that need to be selected on the GET call
		*/
		self.getSelectFields = function() {

			return _selectFields.map( function( item ) {
				return self.propertyName + '.' + item;
			} );

		};




		/**
		* Store/Delete files that changed.
		*/
		self.getSaveCalls = function() {

			console.error( _originalData );

			// Get IDs of entities _before_ anything was edited and curent state.
			var oldIds = _originalData.map( function( item ) {
					return item.id;
				} )
			, newIds = self.media.map( function( item ) {
					return item.id;
				} );



			// Get deleted and created medium relations
			var created = []
				, deleted = [];
			
			newIds.forEach( function( item ) {
				if( oldIds.indexOf( item ) === -1 ) {
					created.push( item );
				}
			} );

			oldIds.forEach( function( item ) {
				if( newIds.indexOf( item ) === -1 ) {
					deleted.push( item );
				}
			} );



			var calls = [];

			// 1. Delete relations
			deleted.forEach( function( item ) {
				calls.push( {
					method		: 'DELETE'
					, url		: self.propertyName + '/' + item
				} );
			} );


			// 2. Create relations
			created.forEach( function( item ) {
				calls.push( {
					method		: 'POST'
					, url		: self.propertyName + '/' + item
				} );
			} );


			return calls;

		};




		/**
		* Returns highest sortOrder on current media. 
		*/
		function getHighestSortOrder() {

			var highestSortOrder = -1;
			self.media.forEach( function( medium ) {

				if( medium.mediumGroup_medium && medium.mediumGroup_medium.length ) {
					highestSortOrder = Math.max( highestSortOrder, medium.mediumGroup_medium[ 0 ].sortOrder );
				}

			} );

			return highestSortOrder;

		}



		/**
		* Store order. All media must first have been saved (getSaveCalls was called earlier)
		*/
		self.afterSaveTasks = function() {


			// No (relevant) changes? Make a quick check.
			// TBD.
			/*if( _originalData.length === self.media.length ) {

				var sameOrder = false;
				_originalData.forEach( function( item, index ) {
					if( item.sortOrder === )
				} );

			}*/


			var highestSortOrder 	= getHighestSortOrder()
				, calls 			= [];

			// Update orders
			self.media.forEach( function( medium ) {

				calls.push( APIWrapperService.request( {
					url				: '/mediumGroup/' + _detailViewController.getEntityId() + '/medium/' + medium.id
					, method		: 'PATCH'
					, data			: {
						sortOrder	: ++highestSortOrder
					}
				} ) );
				
			} );

			return $q.all( calls );

		};




		self.isValid = function() {
			return true;
		};


		self.isRequired = function() {
			return false;
		};


		self.removeMedium = function( medium ) {

			self.media.splice( self.media.indexOf( medium ), 1 );

		};


	} ] )



	.run( [ '$templateCache', function( $templateCache ) {

		$templateCache.put( 'backofficeMediaGroupComponentTemplate.html',

			'<div class=\'backoffice-media-group-component\'>' +

				'<div class=\'row\'>' +
					'<div class=\'col-md-12\'>' +

						'<ol class=\'clearfix\' data-drag-drop-list>' +
							'<li data-ng-repeat=\'medium in backofficeMediaGroupComponent.media\' draggable=\'true\'>' +
								'<div data-ng-if=\'medium.image\'>' +
									'<button data-ng-click=\'backofficeMediaGroupComponent.removeMedium(medium)\'>&times;</button>' +
									'<img data-ng-attr-src=\'{{medium.image.url}}\'>' +
								'</div>' +
								'<div data-ng-if=\'medium.video && medium.video.videoType.identifier === "youtube"\'>' +
									'<button data-ng-click=\'backofficeMediaGroupComponent.removeMedium(medium)\'>&times;</button>' +
									'<img data-ng-attr-src=\'http://img.youtube.com/vi/{{medium.video.uri}}/0.jpg\'>' +
								'</div>' +
							'</li>' +
						'</ol>' +

					'</div>' +
				'</div>' +

				'<div class=\'row\'>' +
					'<div class=\'col-md-12\'>' +

						'<div class="relation-select" ' +
							'data-relation-input ' +
							'data-ng-attr-data-relation-entity-endpoint="{{backofficeMediaGroupComponent.propertyName}}" ' +
							'data-relation-interactive="false" ' +
							'data-deletable="false" ' +
							'data-relation-entity-search-field="title" ' +
							'data-relation-suggestion-template="[[title]] <img src=\'[[image.url]]\'/>" ' +
							'data-ng-model="backofficeMediaGroupComponent.addMediumModel" ' +
							'data-multi-select="true">' +
						'</div>' +

					'</div>' +
					/*'<div class=\'col-md-3\'>' +

						'<button class="btn btn btn-success" data-ng-attr-ui-sref="app.detail({entityName:\'{{backofficeMediaGroupComponent.propertyName}}\',entityId:\'new\'})">{{ \'web.backoffice.mediumGroup.createMedium\' | translate }}</button>' +

					'</div>' +*/
				'</div>' +
			'</div>'

		);

	} ] );


} )();


/**
* As a tree is a simple relation on the entity it belongs to, we have to create a component
* that is not initialized through auto-form
*/
angular
.module( 'jb.formComponents' )
.directive( 'jbFormTreeComponent', [ function() {

	return {

		  controller		: 'JBFormTreeComponentController'
		, link				: function( scope, element, attrs, ctrl ) {
			ctrl.init(scope, element);
		}
		, templateUrl		: 'treeTemplate.html'
		, scope				: {
			// Filter: When making GET call, filter is applied, e.g id_menu=5. Is needed if 
			// the nested set is grouped (e.g. menuItems might be grouped by menu). 
			// If data is stored, filter is passed through POST call to the server; 
			// { id: 5, children[ { id: 2 } ] } becomes { id: 5, id_menu: 3, children[ { id: 2, id_menu: 3 } ] }
            // @todo: this might not be working due to the isolated scope
			  //filter	    : '=treeComponentFilter'
			labelName		: '@treeComponentLabel'
			, entityName	: '@for'
			, maxDepth		: '@'
		}
		, bindToController	: true
		, controllerAs		: 'treeComponentController'
	};

} ] )


.controller( 'JBFormTreeComponentController', [
          '$scope'
        , '$rootScope'
        , '$attrs'
        , '$location'
        , '$q'
        , 'APIWrapperService'
        , 'JBFormComponentsService'
        , function( $scope, $rootScope, $attrs, $location, $q, APIWrapperService, componentsService ) {

	var self			= this
		, element
		, detailViewController
		, maxDepth		= $attrs.maxDepth || 10;

	self.dataTree		= undefined;

	
	if( !self.labelName || !self.entityName ) {
		console.warn( 'JBFormTreeComponentController: labelName or entityName (for) attribute missing' );
	}


	/**
	* Called when user clicks pencil on a list item 
	*/
	self.editEntity = function( ev, id ) {
		
		ev.preventDefault();
		$location.path( '/' + $attrs.for + '/' + id );

	};


	// Called by link function
	self.init = function( scope, el, detViewCtrl ) {

		element					= el;
		componentsService.registerComponent(scope, self);

	};



    /*
     * @todo: check what we need!
     */
    self.registerAt = function(parent){
        //parent.registerOptionsDataHandler(self.handleOptionsData);
        parent.registerGetDataHandler(self.handleGetData);
    };


    /**
    * We don't really need handleGetData – just use it to get the other data we need.
    * data relates to the menu – use the menu's id get menuItems from this menu
    */ 
    self.handleGetData = function(data) {
    	self.data = data;
    	self.getData(data && data.id? data.id : undefined);
    };


    self.isValid = function() {
    	return true;
    };


	/**
	* If we get data through the detailViewController (self.select/registerGetDataHandler)
	* we can't pass a range argument. The menu might be much longer!
	*/
	self.getData = function(menuId) {

		// No menu ID: We're in the 'new' mode. Don't get any data.
		if (!menuId) return;

		// Create headers
		var headers = {
			range		: '0-1000'
		};

		console.log('JBFormTreeComponentController: filter items for menuId %o', menuId);

		/*if( self.filter ) {
			var filter = '';
			for( var i in self.filter ) {
				filter = i + '=' + self.filter[ i ];
			}
			headers.filter = filter;
		}*/
		headers.filter = 'id_menu=' + menuId;

		// Make GET request
		APIWrapperService.request( {
			method			: 'GET'
			, url			: '/' + self.entityName
			, headers		: headers
		} )
		.then( function( data ) {
			self.updateData( data );

		}, function( err ) {
			$rootScope.$broadcast( 'notification', {
				type				: 'error'
				, message			: 'web.backoffice.detail.loadingError'
				, variables			: {
					errorMessage	: err
				}
			} );
		} );

	};





	/**
	* Listens for data gotten in getData
	*/
	self.updateData = function( data ) {

		console.log('JBFormTreeComponentController: data is %o', data);

		self.dataTree = getTree( data );
		console.log( 'JBFormTreeComponentController: dataTree is %o', self.dataTree );

		// Wait for template to be rendered
		setTimeout( function() {
		
			// Add class required for jQuery plugin			
			element.addClass( 'dd' );
			// Add jQuery plugin
			element.nestable( {
				dragClass				: 'dd-dragelement'
				, placeClass			: 'dd-placeholder'
				, maxDepth				: self.maxDepth
			} );

		}, 500 );
		
	};






	/**
	* Returns data to be stored. There's a special JSON POST call available to store a tree. 
	*/
	self.getSaveCalls = function() {

		// When we're in the 'new' mode, don't store tree as it does not exist
		if (!self.data || !self.data.id) return [];
		
		var treeData = element.nestable( 'serialize' );
		console.log( 'JBFormTreeComponentController: Store data %o', treeData );

		var cleanedTreeData = self.cleanTreeData( treeData );
		console.log( 'JBFormTreeComponentController: Cleaned data %o, got %o', treeData, cleanedTreeData );

		return {
			method				: 'POST'
			, headers			: {
				'Content-Type'	: 'application/json'
			}
			, url				: '/' + self.entityName
			, data				: cleanedTreeData
		};

	};




	/**
	* nestable('serialize') returns data with a lot of junk on it – remove it and only leave
	* the properties «id» and «children» left. Recurive function.
	* originalTreeData, as serialized by nestable('serialize') is an object with keys 0, 1, 2, 3… 
	* and not an array.
	*/
	self.cleanTreeData = function( originalTreeData, cleaned ) {

		if( !cleaned ) {
			cleaned = [];
		}

		for( var i in originalTreeData ) {

			var branch = originalTreeData[ i ];

			var cleanBranch = {};
			cleanBranch.id = branch.id;

			// If filter was set, add it to the data that will be sent to the server. 
			if( self.filter ) {

				for( var j in self.filter ) {
					cleanBranch[ j ] = self.filter[ j ];
				}

			}

			// Children: Recursively call cleanTreeData
			if( branch.children ) {
				cleanBranch.children = [];
				self.cleanTreeData( branch.children, cleanBranch.children );
			}

			cleaned.push( cleanBranch );

		}

		return cleaned;

	};









	/* https://github.com/joinbox/eb-service-generics/blob/master/controller/MenuItem.js */
    var getTree = function(rows) {

        var rootNode = {};

        // sort the nodes
        rows.sort(function(a, b) {return a.left - b.left;});

        // get the tree, recursive function
        buildTree(rootNode, rows);

        // return the children, the tree has no defined root node
        return rootNode.children;

    };


    var buildTree = function(parentNode, children) {
        var   left          = 'left'
            , right         = 'right'
            , nextRight     = 0
            , nextChildren  = []
            , parent;

        if (!parentNode.children) {parentNode.children = [];}

        children.forEach(function(node) {
            if (node[right] > nextRight) {
                // store next rigth boundary
                nextRight = node[right];

                // reset children array
                nextChildren = [];

                // add to parent
                parentNode.children.push(node);

                // set as parent
                parent = node;
            }
            else if (node[right]+1 === nextRight) {
                nextChildren.push(node);

                // rcursiveky add chuildren
                buildTree(parent, nextChildren);
            }
            else { nextChildren.push(node);}
        });
    };



} ] )




// Base template: create data-tree-form-element-list
.run( function( $templateCache ) {

	$templateCache.put( 'treeBranchTemplate.html',
		'<div class=\'dd-handle\'>' +
			'<span data-ng-if=\'branch[ treeComponentController.labelName ]\'>{{ branch[ treeComponentController.labelName ] }}</span>' +
			'<span data-ng-if=\'!branch[ treeComponentController.labelName ]\'>N/A</span>' +
		'</div>' +
		'<button class=\'fa fa-pencil btn btn-link edit\' data-ng-click=\'treeComponentController.editEntity($event,branch.id)\'></button>' +
		'<ol data-ng-if=\'branch.children\' class=\'dd-list\'>' +
			'<li data-ng-repeat=\'branch in branch.children\' data-ng-include=\'"treeBranchTemplate.html"\' class=\'dd-item\' data-id=\'{{ branch.id }}\'>' +
			'</li>' +
		'</ol>'
	);

	$templateCache.put( 'treeTemplate.html',
		'<ol class=\'dd-list\'>' +
			'<li data-ng-repeat=\'branch in treeComponentController.dataTree\' data-ng-include=\'"treeBranchTemplate.html"\' class=\'dd-item\' data-id=\'{{ branch.id }}\'>' +
			'</li>' +
		'</ol>'
	);

} );
(function(undefined){
    "use strict";
    var _module = angular.module('jb.backofficeAPIWrapper', ['jb.apiWrapper']);

    /**
     * @todo: make the representation more explicit by preserving the types of the relation! The components need to be
     * aware of where to take their option data anyway.
     *
     * @param apiWrapper
     * @constructor
     */
    function BackofficeAPIWrapperService(apiWrapper){
        this.api = apiWrapper;
        this.fieldTypeMapping =  {
              'string'   : 'text'
            , 'decimal'  : 'number'
            , 'integer'  : 'number'
            , 'boolean'  : 'boolean'
            , 'json'     : 'json'
            , 'datetime' : 'datetime'
            , 'date'     : 'datetime'
        };
    }

    BackofficeAPIWrapperService.prototype.request = function(method, params, copyParams) {
        var parameters = (copyParams === false || !method) ? params : angular.copy(params);
        parameters.method = method;
        return this.api.request(parameters);
    };

    BackofficeAPIWrapperService.prototype.getOptions = function(endpoint, params) {
        var parameters = angular.copy(params) || {};
        parameters.url = endpoint;
        return this.request('OPTIONS', parameters, false).then(this.normalizeOptions.bind(this));
    };

    BackofficeAPIWrapperService.prototype.normalizeMappings = function(mappings, options){
        Object.keys(mappings).forEach(function(property) {
            var fieldSpec = mappings[property]
                , relation = {};
            /**
             * @todo: resolve the aliases using the belongs to data, if an entity is within a has many relation
             */
            relation.type           = 'relation';
            relation.entity         = fieldSpec.modelName;
            relation.relationKey    = fieldSpec.key;
            // the id key of the referenced model
            relation.relatedKey     = fieldSpec.primaryKey;
            // use modelName instead of referencedModelName as model is not referenced, but mapped
            relation.relation       = fieldSpec.hasAlias ? fieldSpec.name : fieldSpec.modelName;
            relation.alias          = fieldSpec.hasAlias ? fieldSpec.name : false;
            relation.relationType   = 'multiple';
            relation.originalRelation  = 'hasMany';
            relation.tableName         = fieldSpec.table.name;


            if (relation.entity === 'language') relation.type = 'language';
            if (relation.entity === 'image')    relation.type = 'image';

            options[property] = relation;
            options.internalMappings = options.internalMappings || {};
            options.internalMappings[relation.relation] = relation;
        });
    };

    BackofficeAPIWrapperService.prototype.normalizeReferences = function(references, options){
        Object.keys(references).forEach(function(property){

            var   fieldSpec = references[property]
                , reference = {};

            reference.type      = 'relation';
            reference.entity    = fieldSpec.referencedModelName;
            // referencedModelName is the same as modelName for has many (but referenced as it's hasOne)
            reference.relation  = fieldSpec.hasAlias ? fieldSpec.name : fieldSpec.referencedModelName;

            // If property is an alias, set alias here. Alias for event is e.g. parentEvent (EventBooster).
            // Alias must be used to save relation, but is not available to GET data.
            // GET /originalEntityNameName
            // POST /alias/id/otherEntity/id
            // @todo: check if this is used anywhere!
            reference.alias = fieldSpec.hasAlias ? fieldSpec.name : false;

            reference.relationType = 'single';
            reference.required     = fieldSpec.nullable === false;
            reference.originalRelation  = 'hasOne';
            reference.relationKey       = fieldSpec.key;
            reference.relatedKey        = fieldSpec.referencedColumn;

            options[property] = reference;
            options.internalReferences = options.internalReferences || {};
            options.internalReferences[reference.relationKey] = reference;

            if (reference.entity == 'image') reference.type = 'image';
        });
    };

    BackofficeAPIWrapperService.prototype.normalizeInverseReferences = function(references, options){
        Object.keys(references).forEach(function(property){
            /**
             * @todo: there is a property isMapping, we could merge the mapping data with the current belongs to
             */
            var fieldSpec = references[property];
            options[property] = {
                  type          : 'relation'
                , entity        : fieldSpec.modelName
                , relation      : fieldSpec.hasAlias ? fieldSpec.name : fieldSpec.modelName
                , relatedKey    : fieldSpec.referencedColumn
                , relationKey   : fieldSpec.targetColumn
                , alias         : fieldSpec.hasAlias ? fieldSpec.name : false
                , relationType  : 'multiple'
                , required      : false //!singleFieldData[ p ].nullable won't work, as nullable ain't set
                , originalRelation : 'belongsTo'
            };
        });
    };

    BackofficeAPIWrapperService.prototype.normalizeFields = function(fields, options){
        Object.keys(fields).forEach(function(property){
            var   fieldSpec = fields[property];

            if(fieldSpec.name && fieldSpec.type){
                var fieldType =  this.fieldTypeMapping[fieldSpec.type];
                if(angular.isDefined(fieldType)){
                    var spec = {
                          type      : fieldType
                        , required  : !fieldSpec.nullable
                        , isPrimary : fieldSpec.name === fields.primaryKey
                        , name      : fieldSpec.name
                    };
                    if(fieldType == 'datetime'){
                        spec.time = fieldSpec.type === 'datetime';
                    }
                    options[property] = spec;
                    if(angular.isUndefined(options.internalFields)) options.internalFields = {};
                    options.internalFields[fieldSpec.name] = spec;
                } else {
                    console.error('DetailViewController: unknown field type %o', fieldSpec.type);
                }
            }
        }, this);
        // we did not yet find a primary key field
        if(angular.isUndefined(options.internalFields[fields.primaryKey])){
            options.internalFields[fields.primaryKey] = {
                type      : ''
                , required  : true
                , isPrimary : true
                , name      : fields.primaryKey
            };
        }
    };

    BackofficeAPIWrapperService.prototype.normalizeOptions = function(optionCallData) {

        var   options   = {}
            // for security reasons we copy the field data and avoid modification
            , optionsData = angular.copy(optionCallData)
            , hasMany   = optionsData.hasMany
            , belongsTo = optionsData.belongsTo
            , hasOne    = optionsData.hasOne;

        delete optionsData.hasMany;
        delete optionsData.belongsTo;
        delete optionsData.hasOne;

        this.normalizeReferences(hasOne, options);
        this.normalizeInverseReferences(belongsTo, options);
        this.normalizeMappings(hasMany, options);
        this.normalizeFields(optionsData, options);

        console.log('BackofficeAPIWrapperService: parsed options are %o', options);
        return options;
    };

    _module.service('BackofficeAPIWrapperService', ['APIWrapperService', BackofficeAPIWrapperService]);
})();

( function() {

	'use strict';

	angular

	.module( 'jb.formComponents')

	.directive( 'dragDropList', [ function() {

		return {
				link					: function( $scope, element, attrs, ctrl ) {
						
					var dragDropPlugin;



					// Watch for additions to the DOM. On addition, re-initialize the drag and drop plugin. 
					// Needed if we have e.g. a list that's populated through ng-repeat: it's filled
					// with lis _after_ this function is invoked.
					var observer = new MutationObserver( function( mutations ) {
						
						var elementsAdded = 0;
						[].forEach.call( mutations, function( mutation ) {
							if( mutation.addedNodes && mutation.addedNodes.length ) {
								elementsAdded += mutation.addedNodes.length;
							}
						} );

						if( elementsAdded > 0 ) {
							dragDropPlugin.destroy();
							dragDropPlugin = new DragDropList( element[ 0 ].querySelectorAll( '[draggable="true"]' ) );
						}

					} );

					observer.observe( element[ 0 ], {
						childList: true
					} );

					$scope.$on( '$destroy', function() {
						observer.disconnect();
					} );



					// Initilaize drag and drop plugin
					dragDropPlugin = new DragDropList( element[ 0 ].querySelectorAll( '[draggable="true"]' ) );



				}
				, scope: {
				}
			};


	} ] );



	var DragDropList;

	// Hide stuff
	( function() {
	
		var _elements
			, _currentDragElement;


		DragDropList = function( elements ) {

			_elements = elements;

			console.log( 'DragDropList: Initialize for elements %o', elements );

			[].forEach.call( elements, function( element ) {
			
				element.setAttribute( 'draggable', true );
				addHandlers( element );

			} );

		};

		DragDropList.prototype.destroy = function() {

			console.log( 'DragDropList: Destroy event handlers on %o elements', _elements.length );

			[].forEach.call( _elements, function( element ) {
				removeHandlers( element );
			} );

		};


		function removeHandlers( element ) {
			
			element.removeEventListener( 'dragstart', dragStartHandler );
		
		}

		function addHandlers( element ) {

			element.addEventListener( 'dragstart', dragStartHandler );
			element.addEventListener( 'dragenter', dragEnterHandler );
			element.addEventListener( 'dragover', dragOverHandler );
			element.addEventListener( 'dragleave', dragLeaveHandler );
			element.addEventListener( 'drop', dropHandler );
			element.addEventListener( 'dragend', dragEndHandler );

		}

		function dragStartHandler( ev ) {

			// Use currentTarget instead of target: target my be a child element.
			ev.currentTarget.style.opacity = '0.4';
			_currentDragElement = ev.currentTarget;
			ev.dataTransfer.effectAllowed = 'move';
			ev.dataTransfer.setData( 'text/html', ev.currentTarget.outerHTML );

		}


		function dragEnterHandler( ev ) {
			ev.target.classList.add( 'drag-over' );
		}

		function dragLeaveHandler( ev ) {
			ev.target.classList.remove( 'drag-over' );
		}


		function dragOverHandler( ev ) {
			
			if ( ev.preventDefault ) {
					ev.preventDefault();
			}
			ev.dataTransfer.dropEffect = 'move';
			return false;

		}


		function dropHandler( ev ) {

			if (ev.stopPropagation) {
				ev.stopPropagation();
			}

			var oldOrder = getElementIndex( _currentDragElement );

			if ( _currentDragElement !== ev.currentTarget ) {

				console.log( 'dragDropList: Drop: %o after %o', _currentDragElement, ev.currentTarget );
				angular.element( ev.currentTarget ).after( _currentDragElement );

				// Dispatch orderChange event on li
				// Necessary to change the order on a possible parent directive
				var orderChangeEvent = new CustomEvent( 'orderChange', { 
					bubbles			: true
					, detail		:{	
						oldOrder	: oldOrder
						, newOrder	: getElementIndex( ev.currentTarget ) + 1
					}
				} );
				ev.currentTarget.dispatchEvent( orderChangeEvent );
			
			}

			return false;

		}


		/**
		* Returns the index (position) of an element within its parent element. 
		* @param <String> selector: Only respect sibling elements of element that match the selector (TBD)
		*/
		function getElementIndex( element ) {
			var siblings	= element.parentNode.childNodes
				, index		= 0;
			for( var i = 0; i < siblings.length; i++ ) {
				if( element === siblings[ i ] ) {
					return index;
				}
				if( siblings[ i ].nodeType === 1 ) {
					index++;
				}
			}
			return -1;
		}


		function dragEndHandler( ev ) {

			_currentDragElement.style.opacity = '1';
			_currentDragElement = undefined;
			// Make sure all .drag-over classes are removed
			[].forEach.call( _elements, function( element ) {
				element.classList.remove( 'drag-over' );
			} );

		}


	} )();



} )();


/*https://raw.githubusercontent.com/dbushell/Nestable/master/jquery.nestable.js*/
/*!
 * Nestable jQuery Plugin - Copyright (c) 2012 David Bushell - http://dbushell.com/
 * Dual-licensed under the BSD or MIT licenses
 */
;(function($, window, document, undefined)
{
    var hasTouch = 'ontouchstart' in document;

    /**
     * Detect CSS pointer-events property
     * events are normally disabled on the dragging element to avoid conflicts
     * https://github.com/ausi/Feature-detection-technique-for-pointer-events/blob/master/modernizr-pointerevents.js
     */
    var hasPointerEvents = (function()
    {
        var el    = document.createElement('div'),
            docEl = document.documentElement;
        if (!('pointerEvents' in el.style)) {
            return false;
        }
        el.style.pointerEvents = 'auto';
        el.style.pointerEvents = 'x';
        docEl.appendChild(el);
        var supports = window.getComputedStyle && window.getComputedStyle(el, '').pointerEvents === 'auto';
        docEl.removeChild(el);
        return !!supports;
    })();

    var defaults = {
            listNodeName    : 'ol',
            itemNodeName    : 'li',
            rootClass       : 'dd',
            listClass       : 'dd-list',
            itemClass       : 'dd-item',
            dragClass       : 'dd-dragel',
            handleClass     : 'dd-handle',
            collapsedClass  : 'dd-collapsed',
            placeClass      : 'dd-placeholder',
            noDragClass     : 'dd-nodrag',
            emptyClass      : 'dd-empty',
            expandBtnHTML   : '<button data-action="expand" type="button">Expand</button>',
            collapseBtnHTML : '<button data-action="collapse" type="button">Collapse</button>',
            group           : 0,
            maxDepth        : 5,
            threshold       : 20
        };

    function Plugin(element, options)
    {
        this.w  = $(document);
        this.el = $(element);
        this.options = $.extend({}, defaults, options);
        this.init();
    }

    Plugin.prototype = {

        init: function()
        {
            var list = this;

            list.reset();

            list.el.data('nestable-group', this.options.group);

            list.placeEl = $('<div class="' + list.options.placeClass + '"/>');

            $.each(this.el.find(list.options.itemNodeName), function(k, el) {
                list.setParent($(el));
            });

            list.el.on('click', 'button', function(e) {
                if (list.dragEl) {
                    return;
                }
                var target = $(e.currentTarget),
                    action = target.data('action'),
                    item   = target.parent(list.options.itemNodeName);
                if (action === 'collapse') {
                    list.collapseItem(item);
                }
                if (action === 'expand') {
                    list.expandItem(item);
                }
            });

            var onStartEvent = function(e)
            {
                var handle = $(e.target);
                if (!handle.hasClass(list.options.handleClass)) {
                    if (handle.closest('.' + list.options.noDragClass).length) {
                        return;
                    }
                    handle = handle.closest('.' + list.options.handleClass);
                }

                if (!handle.length || list.dragEl) {
                    return;
                }

                list.isTouch = /^touch/.test(e.type);
                if (list.isTouch && e.touches.length !== 1) {
                    return;
                }

                e.preventDefault();
                list.dragStart(e.touches ? e.touches[0] : e);
            };

            var onMoveEvent = function(e)
            {
                if (list.dragEl) {
                    e.preventDefault();
                    list.dragMove(e.touches ? e.touches[0] : e);
                }
            };

            var onEndEvent = function(e)
            {
                if (list.dragEl) {
                    e.preventDefault();
                    list.dragStop(e.touches ? e.touches[0] : e);
                }
            };

            if (hasTouch) {
                list.el[0].addEventListener('touchstart', onStartEvent, false);
                window.addEventListener('touchmove', onMoveEvent, false);
                window.addEventListener('touchend', onEndEvent, false);
                window.addEventListener('touchcancel', onEndEvent, false);
            }

            list.el.on('mousedown', onStartEvent);
            list.w.on('mousemove', onMoveEvent);
            list.w.on('mouseup', onEndEvent);

        },

        serialize: function()
        {
            var data,
                depth = 0,
                list  = this,
                step  = function(level, depth)
                {
                    var array = [ ],
                        items = level.children(list.options.itemNodeName);
                    items.each(function()
                    {
                        var li   = $(this),
                            item = $.extend({}, li.data()),
                            sub  = li.children(list.options.listNodeName);
                        if (sub.length) {
                            item.children = step(sub, depth + 1);
                        }
                        array.push(item);
                    });
                    return array;
                };
            data = step(list.el.find(list.options.listNodeName).first(), depth);
            return data;
        },

        serialise: function()
        {
            return this.serialize();
        },

        reset: function()
        {
            this.mouse = {
                offsetX   : 0,
                offsetY   : 0,
                startX    : 0,
                startY    : 0,
                lastX     : 0,
                lastY     : 0,
                nowX      : 0,
                nowY      : 0,
                distX     : 0,
                distY     : 0,
                dirAx     : 0,
                dirX      : 0,
                dirY      : 0,
                lastDirX  : 0,
                lastDirY  : 0,
                distAxX   : 0,
                distAxY   : 0
            };
            this.isTouch    = false;
            this.moving     = false;
            this.dragEl     = null;
            this.dragRootEl = null;
            this.dragDepth  = 0;
            this.hasNewRoot = false;
            this.pointEl    = null;
        },

        expandItem: function(li)
        {
            li.removeClass(this.options.collapsedClass);
            li.children('[data-action="expand"]').hide();
            li.children('[data-action="collapse"]').show();
            li.children(this.options.listNodeName).show();
        },

        collapseItem: function(li)
        {
            var lists = li.children(this.options.listNodeName);
            if (lists.length) {
                li.addClass(this.options.collapsedClass);
                li.children('[data-action="collapse"]').hide();
                li.children('[data-action="expand"]').show();
                li.children(this.options.listNodeName).hide();
            }
        },

        expandAll: function()
        {
            var list = this;
            list.el.find(list.options.itemNodeName).each(function() {
                list.expandItem($(this));
            });
        },

        collapseAll: function()
        {
            var list = this;
            list.el.find(list.options.itemNodeName).each(function() {
                list.collapseItem($(this));
            });
        },

        setParent: function(li)
        {
            if (li.children(this.options.listNodeName).length) {
                li.prepend($(this.options.expandBtnHTML));
                li.prepend($(this.options.collapseBtnHTML));
            }
            li.children('[data-action="expand"]').hide();
        },

        unsetParent: function(li)
        {
            li.removeClass(this.options.collapsedClass);
            li.children('[data-action]').remove();
            li.children(this.options.listNodeName).remove();
        },

        dragStart: function(e)
        {
            var mouse    = this.mouse,
                target   = $(e.target),
                dragItem = target.closest(this.options.itemNodeName);

            this.placeEl.css('height', dragItem.height());

            mouse.offsetX = e.offsetX !== undefined ? e.offsetX : e.pageX - target.offset().left;
            mouse.offsetY = e.offsetY !== undefined ? e.offsetY : e.pageY - target.offset().top;
            mouse.startX = mouse.lastX = e.pageX;
            mouse.startY = mouse.lastY = e.pageY;

            this.dragRootEl = this.el;

            this.dragEl = $(document.createElement(this.options.listNodeName)).addClass(this.options.listClass + ' ' + this.options.dragClass);
            this.dragEl.css('width', dragItem.width());

            dragItem.after(this.placeEl);
            dragItem[0].parentNode.removeChild(dragItem[0]);
            dragItem.appendTo(this.dragEl);

            $(document.body).append(this.dragEl);
            this.dragEl.css({
                'left' : e.pageX - mouse.offsetX,
                'top'  : e.pageY - mouse.offsetY
            });
            // total depth of dragging item
            var i, depth,
                items = this.dragEl.find(this.options.itemNodeName);
            for (i = 0; i < items.length; i++) {
                depth = $(items[i]).parents(this.options.listNodeName).length;
                if (depth > this.dragDepth) {
                    this.dragDepth = depth;
                }
            }
        },

        dragStop: function(e)
        {
            var el = this.dragEl.children(this.options.itemNodeName).first();
            el[0].parentNode.removeChild(el[0]);
            this.placeEl.replaceWith(el);

            this.dragEl.remove();
            this.el.trigger('change');
            if (this.hasNewRoot) {
                this.dragRootEl.trigger('change');
            }
            this.reset();
        },

        dragMove: function(e)
        {
            var list, parent, prev, next, depth,
                opt   = this.options,
                mouse = this.mouse;

            this.dragEl.css({
                'left' : e.pageX - mouse.offsetX,
                'top'  : e.pageY - mouse.offsetY
            });

            // mouse position last events
            mouse.lastX = mouse.nowX;
            mouse.lastY = mouse.nowY;
            // mouse position this events
            mouse.nowX  = e.pageX;
            mouse.nowY  = e.pageY;
            // distance mouse moved between events
            mouse.distX = mouse.nowX - mouse.lastX;
            mouse.distY = mouse.nowY - mouse.lastY;
            // direction mouse was moving
            mouse.lastDirX = mouse.dirX;
            mouse.lastDirY = mouse.dirY;
            // direction mouse is now moving (on both axis)
            mouse.dirX = mouse.distX === 0 ? 0 : mouse.distX > 0 ? 1 : -1;
            mouse.dirY = mouse.distY === 0 ? 0 : mouse.distY > 0 ? 1 : -1;
            // axis mouse is now moving on
            var newAx   = Math.abs(mouse.distX) > Math.abs(mouse.distY) ? 1 : 0;

            // do nothing on first move
            if (!mouse.moving) {
                mouse.dirAx  = newAx;
                mouse.moving = true;
                return;
            }

            // calc distance moved on this axis (and direction)
            if (mouse.dirAx !== newAx) {
                mouse.distAxX = 0;
                mouse.distAxY = 0;
            } else {
                mouse.distAxX += Math.abs(mouse.distX);
                if (mouse.dirX !== 0 && mouse.dirX !== mouse.lastDirX) {
                    mouse.distAxX = 0;
                }
                mouse.distAxY += Math.abs(mouse.distY);
                if (mouse.dirY !== 0 && mouse.dirY !== mouse.lastDirY) {
                    mouse.distAxY = 0;
                }
            }
            mouse.dirAx = newAx;

            /**
             * move horizontal
             */
            if (mouse.dirAx && mouse.distAxX >= opt.threshold) {
                // reset move distance on x-axis for new phase
                mouse.distAxX = 0;
                prev = this.placeEl.prev(opt.itemNodeName);
                // increase horizontal level if previous sibling exists and is not collapsed
                if (mouse.distX > 0 && prev.length && !prev.hasClass(opt.collapsedClass)) {
                    // cannot increase level when item above is collapsed
                    list = prev.find(opt.listNodeName).last();
                    // check if depth limit has reached
                    depth = this.placeEl.parents(opt.listNodeName).length;
                    if (depth + this.dragDepth <= opt.maxDepth) {
                        // create new sub-level if one doesn't exist
                        if (!list.length) {
                            list = $('<' + opt.listNodeName + '/>').addClass(opt.listClass);
                            list.append(this.placeEl);
                            prev.append(list);
                            this.setParent(prev);
                        } else {
                            // else append to next level up
                            list = prev.children(opt.listNodeName).last();
                            list.append(this.placeEl);
                        }
                    }
                }
                // decrease horizontal level
                if (mouse.distX < 0) {
                    // we can't decrease a level if an item preceeds the current one
                    next = this.placeEl.next(opt.itemNodeName);
                    if (!next.length) {
                        parent = this.placeEl.parent();
                        this.placeEl.closest(opt.itemNodeName).after(this.placeEl);
                        if (!parent.children().length) {
                            this.unsetParent(parent.parent());
                        }
                    }
                }
            }

            var isEmpty = false;

            // find list item under cursor
            if (!hasPointerEvents) {
                this.dragEl[0].style.visibility = 'hidden';
            }
            this.pointEl = $(document.elementFromPoint(e.pageX - document.body.scrollLeft, e.pageY - (window.pageYOffset || document.documentElement.scrollTop)));
            if (!hasPointerEvents) {
                this.dragEl[0].style.visibility = 'visible';
            }
            if (this.pointEl.hasClass(opt.handleClass)) {
                this.pointEl = this.pointEl.parent(opt.itemNodeName);
            }
            if (this.pointEl.hasClass(opt.emptyClass)) {
                isEmpty = true;
            }
            else if (!this.pointEl.length || !this.pointEl.hasClass(opt.itemClass)) {
                return;
            }

            // find parent list of item under cursor
            var pointElRoot = this.pointEl.closest('.' + opt.rootClass),
                isNewRoot   = this.dragRootEl.data('nestable-id') !== pointElRoot.data('nestable-id');

            /**
             * move vertical
             */
            if (!mouse.dirAx || isNewRoot || isEmpty) {
                // check if groups match if dragging over new root
                if (isNewRoot && opt.group !== pointElRoot.data('nestable-group')) {
                    return;
                }
                // check depth limit
                depth = this.dragDepth - 1 + this.pointEl.parents(opt.listNodeName).length;
                if (depth > opt.maxDepth) {
                    return;
                }
                var before = e.pageY < (this.pointEl.offset().top + this.pointEl.height() / 2);
                    parent = this.placeEl.parent();
                // if empty create new list to replace empty placeholder
                if (isEmpty) {
                    list = $(document.createElement(opt.listNodeName)).addClass(opt.listClass);
                    list.append(this.placeEl);
                    this.pointEl.replaceWith(list);
                }
                else if (before) {
                    this.pointEl.before(this.placeEl);
                }
                else {
                    this.pointEl.after(this.placeEl);
                }
                if (!parent.children().length) {
                    this.unsetParent(parent.parent());
                }
                if (!this.dragRootEl.find(opt.itemNodeName).length) {
                    this.dragRootEl.append('<div class="' + opt.emptyClass + '"/>');
                }
                // parent root list has changed
                if (isNewRoot) {
                    this.dragRootEl = pointElRoot;
                    this.hasNewRoot = this.el[0] !== this.dragRootEl[0];
                }
            }
        }

    };

    $.fn.nestable = function(params)
    {
        var lists  = this,
            retval = this;

        lists.each(function()
        {
            var plugin = $(this).data("nestable");

            if (!plugin) {
                $(this).data("nestable", new Plugin(this, params));
                $(this).data("nestable-id", new Date().getTime());
            } else {
                if (typeof params === 'string' && typeof plugin[params] === 'function') {
                    retval = plugin[params]();
                }
            }
        });

        return retval || lists;
    };

})(window.jQuery || window.Zepto, window, document);