/**
	When the HTML has finished loading, enter the app
*/
window.onload = function(){
	if(!hasStorage()){
		alert('Your browser does not support session storage and this app requires it. :(');
	}
	else {
		load();
	}
};

/**
	Load: configure navigation based on logged in state, then navigate to correct page.
*/
function load(){
	if(hasAuth()){
		setNavLoggedIn();
	}
	else {
		setNavLoggedOut();
	}
	if(!hasAuth()){
		loadHome();
	}
	else {
		loadTaskList();
	}
}

/**
	Set the navigation bar to contain only items required for logged in state
*/
function setNavLoggedIn(){
	$('#nav-login').css('display', 'none');
	$('#nav-register').css('display', 'none');
	$('#nav-tasks').css('display', 'block');
	$('#nav-tasks').click(function(){
		loadTaskList();
	});
	$('#nav-logout').css('display', 'block');
	$('#nav-logout').click(function(){
		clearAuth();
		loadHome();
	});
	$('#navbar-brand').click(function(){
		loadTaskList();
	});
}


/**
	Set the navigation bar to contain only items required for logged in state
*/
function setNavLoggedOut(){
	$('#nav-tasks').css('display', 'none');
	$('#nav-logout').css('display', 'none');
	$('#nav-login').css('display', 'block');
	$('#nav-login').click(function(){
		loadHome();
	});
	$('#nav-register').css('display', 'block');
	$('#nav-register').click(function(){
		loadRegister();
	});
	$('#navbar-brand').click(function(){
		loadHome();
	});
}

function loadHome(){
	//Build the form
	$('#content').empty().append('<div id="home" class="d-flex align-items-center justify-content-center"><div class="container"><div class="row"><div class="col"><h1>Login</h1></div></div><div class="row"><div class="col"><form id="login-form" action="#" method="POST"><div class="form-group"><label for="email">Email Address</label><input type="email" class="form-control" id="email" placeholder="Enter email" required></div><div class="form-group"><label for="password">Password</label><div class="input-group"><input type="password" class="form-control" id="password" placeholder="Enter password" required><div class="input-group-append" id="show-password" title="Show password"><span class="input-group-text"><span class="fas fa-eye" id="show-password-icon"></span></span></div></div></div><button type="submit" class="btn btn-primary" form="login-form">Login</button></form></div></div></div></div>');
	//Handlers to show and hide the password.
	document.getElementById('show-password').addEventListener('mousedown', function(){
		togglePasswordFieldVisibility(true);
	}, false);
	document.getElementById('show-password').addEventListener('mouseup', function(){
		togglePasswordFieldVisibility(false);
	}, false);
	document.getElementById('show-password').addEventListener('mouseout', function(){
		togglePasswordFieldVisibility(false);
	}, false);
	document.getElementById('login-form').addEventListener('submit', async function(e){
		//Prevent the browser submitting the form
		e.preventDefault();
		e.stopPropagation();
		await fetch('/api/v1/auth', {
			method: 'POST',
			body: JSON.stringify({
				email:document.getElementById('email').value,
				password:document.getElementById('password').value
			}),
			headers:{
				'Content-Type': 'application/json',
				'Accept':'application/json'
			}
		}).then(async function(response){
			//Once the response finishes, get the body
			let json = await response.json();
			if(response.ok){
				//If the response succeeded, we are now logged in. Store JWT
				clearAuth();
				setAuth(json.token);
				setNavLoggedIn();
				loadTaskList();
			}
			else {				
				alert(json['error']);
			}
		}).catch(standardCatch);
	}, false);
}

function loadRegister(){
	if(hasAuth()){
		loadTaskList();
	}
	$('#content').empty().append('<div class="container"><div class="row"><div class="col"><h1>Register</h1></div></div><div class="row"><div class="col"><form id="register-form" action="#" method="POST"><div class="form-group"><label for="email">Email</label><input type="email" class="form-control" id="email" name="email" placeholder="Enter email" required minlength="3" maxlength="254"></div><div class="form-group"><label for="password">Password</label><input type="password" class="form-control" id="password" name="password" placeholder="Enter password" required minlength="8" maxlength="50"></div><div class="form-group"><label for="firstName">First Name</label><input type="text" class="form-control" id="firstName" name="firstName" placeholder="Enter first name" required minlength="1" maxlength="50"></div><div class="form-group"><label for="lastName">Last Name</label><input type="text" class="form-control" id="lastName" name="lastName" placeholder="Enter last name" required minlength="1" maxlength="50"></div><button type="submit" class="btn btn-primary" form="register-form">Register</button></form></div></div></div>');
	$('#register-form').submit(function(e){
		e.preventDefault();
		e.stopPropagation();
		let newBody = getNewBody(e);
		userPost(newBody);
	});
}

async function loadTaskList(){
	if(!hasAuth()){
		loadHome();
	}
	$('#content').empty().append('<div id="tasks" class="my-3"><div class="container"><div class="row"><div class="col"><h1>Tasks</h1></div></div><div class="row"><div class="col"><button id="new-task" type="button" class="btn btn-primary float-right mb-3">New Task</button></div></div></div><div id="tasks-list-container" class="container"></div></div>');
	//When new task is clicked, convert page to the creation page
	$('#new-task').click(async function(){
		$('#content').empty().append(getTaskPage());
		$('#place-list').remove();
		$('#task-form').submit(async function(e){
			e.preventDefault();
			e.stopPropagation();
			let newBody = getNewBody(e);
			//Remap the time fields from datetime-local to be proper times the server can understand
			newBody['timeStart'] = newBody['timeStart'].replace('T', ' ');
			newBody['timeEnd'] = newBody['timeEnd'].replace('T', ' ');
			taskPost(newBody);
		});
	});
	//Get the tasks
	await fetch('/api/v1/tasks', {
		method:'GET',
		headers: {
			'Accept':'application/json',
			'Authorization':getAuth()
		}
	}).then(async function(response){
		let responseBody = await response.json();
		if(response.ok){
			let c = $('#tasks-list-container');
			for(var i in responseBody){
				//Add every item to the DOM
				let task = responseBody[i];
				let item = $('<div class="row list-item task-list-item"><div class="col-lg-6"><p>Name: <span class="name"></span></p></div><div class="col-lg-3"><p>Time Start: <span class="timeStart"></span></p></div><div class="col-lg-3"><p>Time End: <span class="timeEnd"></span></p></div></div>');
				item.click(function(){
					loadTask(task.id);
				});
				$('.name', item).text(task.name);
				$('.timeStart', item).text(task.timeStart);
				$('.timeEnd', item).text(task.timeEnd);
				c.append(item);
				if(i < responseBody.length){
					c.append('<hr />');
				}
			}
		}
		else {
			standardError(response.status, responseBody);
		}
	}).catch(standardCatch);
}

async function loadTask(id){
	if(!hasAuth()){
		loadHome();
	}
	$('#content').empty().append(getTaskPage());
	$('#task-action').text('Update Task');
	//Load a particular task
	await fetch('/api/v1/tasks/' + id, {
		method:'GET',
		headers: {
			'Accept':'application/json',
			'Authorization':getAuth()
		}
	}).then(async function(response){
		let responseBody = await response.json();
		if(response.ok){
			$('#task-form').submit(async function(e){
				//If the task was loaded, bind the form to submit an update for that particular task.
				e.preventDefault();
				e.stopPropagation();
				let newBody = getNewBody(e);
				newBody['timeStart'] = newBody['timeStart'].replace('T', ' ');
				newBody['timeEnd'] = newBody['timeEnd'].replace('T', ' ');
				await fetch('/api/v1/tasks/' + id, {
					method:'PATCH',
					headers: {
						'Content-Type':'application/json',
						'Accept':'application/json',
						'Authorization':getAuth()
					},
					body:JSON.stringify(newBody)
				}).then(async function(taskUpdateResponse){
					let taskUpdateResponseBody = await taskUpdateResponse.json();
					if(taskUpdateResponse.ok){
						alert('Task updated.');
					}
					else {
						standardError(taskUpdateResponse.status, taskUpdateResponseBody);
					}
				}).catch(standardCatch);
			});
			//Bind the delete button
			$('#task-delete').click(async function(){
				taskDelete(responseBody.id);
			});
			//Set all the fields. There aren't many so don't bother using a complex $ search
			$('#id').text(responseBody.id);
			$('#userId').text(responseBody.userId);
			$('#name').val(responseBody.name);
			$('#description').val(responseBody.description);
			$('#timeStart').val(reformatTime(responseBody.timeStart));
			$('#timeEnd').val(reformatTime(responseBody.timeEnd));
			//When new place is clicked,
			$('#new-place').click(function(){
				let newPlace = $(getPlaceForm());
				//Find the closest row and add the place after it
				$('#new-place').closest('.row').after(newPlace);
				$('form', newPlace).submit(async function(e){
					//When the new place form is submitted, POST to create
					e.preventDefault();
					e.stopPropagation();
					let newBody = getNewBody(e);
					newBody.taskId = responseBody.id;
					await fetch('/api/v1/places', {
						method:'POST',
						headers:{
							'Content-Type':'application/json',
							'Accept':'application/json',
							'Authorization':getAuth()
						},
						body:JSON.stringify(newBody)
					}).then(async function(postResponse){
						let postResponseBody = await postResponse.json();
						if(postResponse.ok){
							let target = $(e.target);
							//Unbind the POST functionality if we created the place
							target.off('submit');
							//Bind the update functionality for the place
							target.submit(async function(e){
								e.preventDefault();
								e.stopPropagation();
								placePatch(e, postResponseBody);
							});
							//Bind the delete functionality for the place
							$('button[name="delete"]', newPlace).click(async function(){
								placeDelete(postResponseBody);
							});
							alert('Place created.');
						}
						else {
							standardError(postResponse.status, postResponseBody);
						}
					}).catch(standardCatch);
				});
			});
			//For every place
			for(var i in responseBody.places){
				let place = responseBody.places[i];
				let item = $(getPlaceForm());
				let fields = $('input', item);
				//Get the fields
				for(var j = 0; j < fields.length; j++){
					let field = $(fields[j]);
					let fieldName = field.attr('name');
					field.val(place[fieldName]);
				}
				//Bind the form submission for updates
				$('form', item).submit(async function(e){
					e.preventDefault();
					e.stopPropagation();
					placePatch(e, place);
				});
				//Bind the delete button
				$('button[name="delete"]', item).click(async function(){
					placeDelete(place);
				});
				$('#place-list').append(item);
			}
		}
		else {
			standardError(response.status, responseBody);
		}
	}).catch(standardCatch);
}

function getNewBody(e){
	//Get the inputs in a field and determine what field they map to
	var inputs = $('input, textarea', $(e.target));
	var newBody = {};
	for(var j = 0; j < inputs.length; j++){
		let field = $(inputs[j]);
		newBody[field.attr('name')] = field.val();
	}
	return newBody;
}

/**
	Function to update a place
*/
async function placePatch(e, place){
	let newBody = getNewBody(e);
	await fetch('/api/v1/places/' + place['id'], {
		method:'PATCH',
		headers:{
			'Content-Type':'application/json',
			'Accept':'application/json',
			'Authorization':getAuth()
		},
		body:JSON.stringify(newBody)
	}).then(async function(patchResponse){
		let patchResponseBody = await patchResponse.json();
		if(patchResponse.ok){
			alert('Place updated.');
		}
		else {
			standardError(patchResponse.status, patchResponseBody);
		}
	}).catch(standardCatch);
}

/**
	Function to delete a place
*/
async function placeDelete(place){
	await fetch('/api/v1/places/' + place['id'], {
		method:'DELETE',
		headers:{
			'Accept':'application/json',
			'Authorization':getAuth()
		}
	}).then(async function(response){
		if(response.ok){
			loadTask(place.taskId);
		}
		else {
			let responseBody = await response.json();
			standardError(response.status, responseBody);
		}
	}).catch(standardCatch);
}


/**
	Function to create a task
*/
async function taskPost(data){
	await fetch('/api/v1/tasks', {
		method:'POST',
		headers:{
			'Content-Type':'application/json',
			'Accept':'application/json',
			'Authorization':getAuth()
		},
		body:JSON.stringify(data)
	}).then(async function(response){
		if(response.ok){
			loadTaskList();
		}
		else {
			let responseBody = await response.json();
			standardError(response.status, responseBody);
		}
	}).catch(standardCatch);
}

/**
	Function to delete a task
*/
async function taskDelete(taskId){
	await fetch('/api/v1/tasks/' + taskId, {
		method:'DELETE',
		headers:{
			'Accept':'application/json',
			'Authorization':getAuth()
		}
	}).then(async function(response){
		if(response.ok){
			loadTaskList();
		}
		else {
			let responseBody = await response.json();
			standardError(response.status, responseBody);
		}
	}).catch(standardCatch);
}

/**
	Function to create a user
*/
async function userPost(data){
	await fetch('/api/v1/users', {
		method:'POST',
		headers:{
			'Content-Type':'application/json',
			'Accept':'application/json'
		},
		body:JSON.stringify(data)
	}).then(async function(response){
		if(response.ok){
			loadHome();
		}
		else {
			let responseBody = await response.json();
			standardError(response.status, responseBody);
		}
	}).catch(standardCatch);
}

function reformatTime(sTime){
	//Convert time into acceptable format for datetime-local
	return sTime.replace(' ', 'T');
}

function getTaskPage(){
	return '<div id="task"><div class="container"><div class="row"><div class="col"><h1>Task</h1></div></div><div id="task-metadata"><div class="row"><div class="col"><p>ID: <span id="id"></span></p></div></div><div class="row"><div class="col"><p>User Id: <span id="userId"></span></p></div></div></div><div class="row"><div class="col"><form id="task-form" action="#" method="POST"><div class="form-group"><label for="name">Name</label><input type="text" class="form-control" id="name" name="name" placeholder="Enter name" required minlength="1" maxlength="50"></div><div class="form-group"><label for="description">Description</label><textarea id="description" name="description" class="form-control" placeholder="Enter description" maxlength="1000" required></textarea></div><div class="form-group"><label for="timeStart">Start Time</label><input type="datetime-local" class="form-control" id="timeStart" name="timeStart" step="1" required></div><div class="form-group"><label for="timeEnd">End Time</label><input type="datetime-local" class="form-control" id="timeEnd" name="timeEnd" step="1" required></div><button id="task-action" type="submit" class="btn btn-primary" form="task-form">Create Task</button><button id="task-delete" type="button" class="btn btn-danger mx-1">Delete</button></form></div></div><hr /></div><div id="place-list" class="container"><div class="row"><div class="col"><h2>Places</h2></div></div><div class="row"><div class="col"><button type="button" id="new-place" class="btn btn-primary float-right">New Place</button></div></div></div></div>';
}

function getPlaceForm(){
	return '<div class="row my-3"><div class="col"><form class="place-form" action="#" method="POST"><div class="form-row my-2"><div class="col"><input type="text" class="form-control" name="addressLine1" placeholder="Address Line 1" required minlength="1" maxlength="75"></div><div class="col"><input type="text" class="form-control" name="addressLine2" placeholder="Address Line 2" maxlength="75"></div></div><div class="form-row my-2"><div class="col"><input type="text" class="form-control" name="city" placeholder="City" required minlength="1" maxlength="50"></div><div class="col"><input type="text" class="form-control" name="county" placeholder="County" required minlength="1" maxlength="50"></div></div><div class="form-row my-2"><div class="col"><input type="text" class="form-control" name="postcode" placeholder="Zip/Postal Code" required minlength="1" maxlength="15"></div><div class="col"><input type="text" class="form-control" name="country" placeholder="Country" required minlength="2" maxlength="75"></div></div><button type="submit" class="btn btn-primary">Save</button><button type="button" name="delete" class="btn btn-danger mx-1">Delete</button></form></div></div>';
}

//Handle errors in a standard manner
function standardError(status, body){
	if(status === 401){
		clearAuth();
		loadHome();
	}
	console.log(body);
	alert(body['error']);
}

//Handle promise exceptions in a standard manner
function standardCatch(error){
	console.log(error);
	alert(error.toString());
}

function togglePasswordFieldVisibility(visible = false){
	var pwdField = document.getElementById('password');
	var showPwd = document.getElementById('show-password-icon');
	if(visible){
		pwdField.type = 'text';
		showPwd.className = 'fas fa-eye-slash';
	}
	else {
		pwdField.type = 'password';
		showPwd.className = 'fas fa-eye';
	}
}

//Check if the browser supports local storage
function hasStorage(){
	return typeof(Storage) !== 'undefined';
}

function hasAuth(){
	if(hasStorage()){
		return sessionStorage.getItem('auth') !== null;
	}
}

function getAuth(){
	if(hasStorage()) return sessionStorage.getItem('auth');
}

function setAuth(token){
	if(hasStorage()) sessionStorage.setItem('auth', token);
}

function clearAuth(){
	if(hasAuth()) sessionStorage.removeItem('auth');
}