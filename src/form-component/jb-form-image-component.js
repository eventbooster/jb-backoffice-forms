/**
 * Adds distributed calls to image upload/list component
 */
(function () {

    /* global angular */

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
                    , 'images'          : '=?imageModel'
                    , 'label'           : '@'
                    , 'serviceName'     : '@'
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
                        if (originalObject.focalPoint) focalPoint = JSON.parse(originalObject.focalPoint);
                    }
                    catch (e) {
                        // Doesn't _really_ matter.
                        console.error('jbFormImageComponentController: Could not parse focalPoint JSON', originalObject.focalPoint);
                    }


                    return {
                        // URL of the image itself
                        url: originalObject[self.pathField]
                        // URL of the entity; needed to crop image
                        , entityUrl: '/' + (self.serviceName ? self.serviceName + '.' : '') + 'image/' + originalObject.id
                        , focalPoint: focalPoint
                        , width: originalObject.width || '–'
                        , height: originalObject.height || '–'
                        , fileSize: originalObject.size || '–'
                        , mimeType: originalObject.mimeType ? originalObject.mimeType.mimeType : '–'
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

                    var prefix = (this.serviceName ? this.serviceName + ':' : '') + self.propertyName;
                    return [prefix + '.*', prefix + '.' + self.pathField/*, prefix + '.mimeType.*'*/];

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

                    console.log('jbFormImageComponent: Save single relation. Original %o, current %o', _originalData, self.images);

                    // Removed
                    if (_originalData && _originalData.length && ( !self.images || !self.images.length )) {
                        var data = {};
                        data[_relationKey] = null;
                        console.log('jbFormImageComponent: Image removed, store data %o', data);
                        return [{
                            method: 'DELETE'
                            , url: {
                                  path       : (self.serviceName && self.serviceName !== 'legacy' ? self.serviceName + '.' : '') + self.propertyName + '/' + _originalData[0].id
                                , mainEntity : 'append'
                            }
                        }];
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
                        , url: `/${ self.serviceName ? self.serviceName + '.' : '' }image`
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

