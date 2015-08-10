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
		$scope.$apply( function() {
			self.state = 'hover';
		} );
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
		$scope.$apply( function() {
			self.state = undefined;
		} );
	}




	/////////////////////////////////////////////////////////////////////////////////
	//
	// HTML5 FILE stuff
	//

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
			}


			// Read file ( to display preview)
			$scope.$apply( function() {

				self.files.push( fileData );
	
			} );

		};

		fileReader.readAsDataURL( file );

	}





} ] );