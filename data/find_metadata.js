// find_metadata.js - locate metadata for a given DOM element
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.


var pageMetadata = (function() {
    var api = {};
    var siteFunctions = {};

    //
    // Return true if there is any RDF metadata at all on the page
    //
    
    var hasAnyMetadata = function() {
	attachData();

	return document.data.getSubjects().length > 0;
    };

    api.hasAnyMetadata = hasAnyMetadata;


    //
    // Return all RDF subject nodes on the page
    //
    
    var getAllSubjects = function() {
	var i, uris, subjects;
	
	attachData();
	
	uris = document.data.getSubjects();
	subjects = [];
	for (i = 0; i < uris.length; i++) {
	    subjects.push(document.data.getSubject(uris[i]));
	}

	return subjects;
    };

    api.getAllSubjects = getAllSubjects;


    //
    // Return { element: DOMnode, subject: RDFsubject } or null,
    // representing the main image on the page.
    //
    
    var findMainImage = function() {
	var i, subjects, subject, srcs, src, elements;
	
	attachData();
	
	subjects = document.data.getSubjects(og_image);

	if (subjects.length !== 1) {
	    console.log("can't find unique og:image subject");
	    return null;
	}
	subject = subjects[0];
	
	srcs = document.data.getValues(subject, og_image);

	if (srcs.length !== 1) {
	    console.log("can't find unique og:image property for subject: " + subject);
	    return null;
	}
	src = srcs[0];
	
	elements = document.querySelectorAll('img');

	for (i = 0; i < elements.length; i++) {
	    if (decodeURIComponent(elements[i].src) === src) {
		return { element: elements[i],
			 subject: document.data.getSubject(subject)
		       };
	    }
	}

	console.log("can't find image for subject: " + src);
	return null;
    };

    api.findMainImage = findMainImage;


    //
    // Return the { element: DOMnode, subject: RDFsubject } for this
    // DOM element, or null if there are no usable metadata.
    //
    // The subject is located with this heuristic:
    //
    // * If the element has an id, look for "#id"
    // * If the element has a src, look for that URI
    // * If the element src is the object of an og:image triplet, use that subject
    //
    
    var findImageSubject = function(element) {
	var subject, subjects, src;
	
	if (!element.localName || element.localName.toLowerCase() !== 'img') {
	    return null;
	}

	attachData();

	if (element.id) {
	    subject = document.data.getSubject('#' + element.id);
	    if (subject) {
		console.log('found subject on ID: ' + subject.id);
	    }
	}

	if (!subject && element.src) {
	    src = decodeURIComponent(element.src);
	    subject = document.data.getSubject(src);
	    if (subject) {
		console.log('found subject on src: ' + subject.id);
	    }
	    else {
		subjects = document.data.getSubjects(og_image, src);
		console.log('# og:image subjects in page: ' + subjects.length);
		console.log('og:image subjects: ' + subjects);
		
		if (subjects.length === 1) {
		    subject = document.data.getSubject(subjects[0]);
		}
	    }
	}

	if (subject) {
	    return { element: element, subject: subject };
	}
	else {
	    return null;
	}
    };

    api.findImageSubject = findImageSubject;


    //
    // Internal functions
    //
    
    var attachData = function() {
	// Make sure we have the RDFa API on the page
	if (typeof document.data === 'undefined') {
	    console.log('attaching RDFa API');
	    GreenTurtle.attach(document);
	}
    };


    var overrideFunction = function(name) {
	var funcs = siteFunctions[document.location.hostname];

	if (funcs && funcs[name]) {
	    api[name] = funcs[name];
	}
    };


    //
    // Predicates and other constants
    //
    
    var og_image = 'http://ogp.me/ns#image';
    

    //
    // For some sites with tricky DOM or weird RDFa we extend the
    // defaults.
    //

    var findFlickrSubject = function() {
	var subjects;

	subjects = document.data.getSubjects();
	if (subjects.length !== 1) {
	    console.log('not exactly one subject on flickr page');
	    return null;
	}

	// TODO: rewrite the subject to be about og:url instead to get
	// a better source URI

	return document.data.getSubject(subjects[0]);
    };
    
    siteFunctions['flickr.com'] = siteFunctions['www.flickr.com'] = {

	// On flickr there's a DIV or SPAN over the image

	findMainImage: function() {
	    var img,  subject;

	    attachData();

	    subject = findFlickrSubject();

	    // Main image page
	    img = document.querySelector('img#liquid-photo');

	    if (!img) {
		// Lightbox
		img = document.querySelector('span.facade-of-protection + img.loaded');
	    }
		
	    if (img && subject) {
		console.log('found flickr image');
		return { element: img, subject: subject };
	    }

	    return findMainImage();
	},


	findImageSubject: function(element) {
	    var name, img, subject;

	    attachData();

	    name = element.localName && element.localName.toLowerCase();
	    
	    if (name === 'div' && element.id === 'photo-drag-proxy') {
		// Main image page
		img = document.querySelector('img#liquid-photo');
	    }
	    else if (name === 'span' &&
		     element.classList &&
		     element.classList.contains('facade-of-protection')) {
		// Lightbox
		img = document.querySelector('span.facade-of-protection + img.loaded');
	    }

	    if (img) {
		subject = findFlickrSubject();
		if (subject) {
		    console.log('found flickr image');
		    return { element: img, subject: subject };
		}
	    }

	    return findMainImage();
	},

    }; // flickr.com


    overrideFunction('hasAnyMetadata');
    overrideFunction('getAllSubjects');
    overrideFunction('findMainImage');
    overrideFunction('findImageSubject');


    return api;
}());