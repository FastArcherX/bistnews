// Submit New Article Form Handlers

// Handle new article submission
async function handleSubmitNewArticle(event) {
    event.preventDefault();
    
    const title = document.getElementById('newArticleTitle').value.trim();
    const category = document.getElementById('articleCategory').value;
    const content = document.getElementById('articleContent').value.trim();
    const author = document.getElementById('authorName').value.trim();
    const tags = document.getElementById('articleTags').value.trim();
    const photosInput = document.getElementById('articlePhotos');
    
    if (!title || !category || !content || !author) {
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
                // In a real implementation, this would upload to a server
                // For now, we'll create a placeholder URL
                const photoUrl = `uploads/${Date.now()}_${file.name}`;
                photos.push({
                    name: file.name,
                    url: photoUrl,
                    size: file.size
                });
            }
        }
        
        // Process tags
        const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
        
        // Create article object
        const articleData = {
            title: title,
            category: category,
            content: content,
            author: author,
            tags: tagArray,
            photos: photos,
            published: true,
            createdAt: Date.now(),
            type: 'text_article' // Distinguish from PDF articles
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
            submitBtn.innerHTML = originalText;
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

// Export functions to global scope
window.handleSubmitNewArticle = handleSubmitNewArticle;
window.clearSubmitForm = clearSubmitForm;
window.closeSubmitForm = closeSubmitForm;