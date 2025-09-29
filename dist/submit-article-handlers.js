// Submit New Article Form Handlers

// Handle new article submission
async function handleSubmitNewArticle(event) {
    event.preventDefault();
    
    const title = document.getElementById('newArticleTitle').value.trim();
    const selectedTag = document.getElementById('articleTags').value;
    const content = document.getElementById('articleContent').value.trim();
    const author = document.getElementById('authorName').value.trim();
    const photosInput = document.getElementById('articlePhotos');
    
    if (!title || !selectedTag || !content || !author) {
        alert('Please fill in all required fields.');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = document.querySelector('#submitArticleForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
        submitBtn.disabled = true;
        
        // Process uploaded photos
        const photos = [];
        if (photosInput.files.length > 0) {
            for (let i = 0; i < photosInput.files.length; i++) {
                const file = photosInput.files[i];
                // Convert file to base64 for localStorage storage
                const base64Data = await fileToBase64(file);
                const photoId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const photoUrl = `uploads/articles/${photoId}_${file.name}`;
                
                // Save image data to localStorage
                const imageData = {
                    id: photoId,
                    name: file.name,
                    data: base64Data,
                    type: file.type,
                    size: file.size,
                    url: photoUrl
                };
                
                await saveImageToStorage(imageData);
                
                photos.push({
                    id: photoId,
                    name: file.name,
                    url: photoUrl,
                    size: file.size,
                    type: file.type
                });
            }
        }
        
        // Process tags - now using single selected tag
        const tagArray = selectedTag ? [selectedTag] : [];
        
        // Create article object  
        const articleData = {
            title: title,
            tags: tagArray,
            content: content,
            author: author,
            photos: photos,
            published: true,
            createdAt: Date.now(),
            type: 'text_article', // Distinguish from PDF articles
            views: 0,
            comments: 0
        };
        
        // Save to local database
        const articleId = await saveArticle(articleData);
        
        // Update the articles array
        articles.unshift({
            id: articleId,
            ...articleData
        });
        
        // Show success message
        alert('Article posted successfully!');
        
        // Clear form
        clearSubmitForm();
        
        // Refresh homepage if it's currently shown
        if (window.currentPage === 'home') {
            await showPage('home');
        }
        
        // Switch to Manage Articles tab to show the new article
        const manageTab = document.querySelector('[href="#articoli-tab"]');
        if (manageTab) {
            manageTab.click();
        }
        
    } catch (error) {
        console.error('Error submitting article:', error);
        alert('Error posting article. Please try again.');
    } finally {
        // Reset button state
        const submitBtn = document.querySelector('#submitArticleForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Article Directly';
            submitBtn.disabled = false;
        }
    }
}

// Clear the submit form
function clearSubmitForm() {
    const form = document.getElementById('submitArticleForm');
    if (form) {
        form.reset();
    }
}

// Close submit form (placeholder for modal close functionality)
function closeSubmitForm() {
    // This would close a modal if it was in a modal
    // For now, just clear the form
    clearSubmitForm();
}

// Helper function to convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Save image to localStorage
async function saveImageToStorage(imageData) {
    try {
        const images = JSON.parse(localStorage.getItem('images')) || {};
        images[imageData.id] = imageData;
        localStorage.setItem('images', JSON.stringify(images));
        console.log('✅ Image saved to storage:', imageData.name);
        return imageData.id;
    } catch (error) {
        console.error('❌ Error saving image:', error);
        throw error;
    }
}

// Get image from localStorage
function getImageFromStorage(imageId) {
    try {
        const images = JSON.parse(localStorage.getItem('images')) || {};
        return images[imageId] || null;
    } catch (error) {
        console.error('❌ Error loading image:', error);
        return null;
    }
}

// Export functions to global scope
window.handleSubmitNewArticle = handleSubmitNewArticle;
window.clearSubmitForm = clearSubmitForm;
window.closeSubmitForm = closeSubmitForm;
window.fileToBase64 = fileToBase64;
window.saveImageToStorage = saveImageToStorage;
window.getImageFromStorage = getImageFromStorage;