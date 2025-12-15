import { db, auth } from './firebase-config.js';
import { 
  collection, 
  addDoc, 
  getDoc,
  getDocs, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit,
  updateDoc,
  deleteDoc,
  increment,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ============================================
// TAFSIRAN FUNCTIONS
// ============================================

/**
 * Tambah tafsiran baru
 */
export async function addTafsiran(data) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const tafsirData = {
      geniusId: data.geniusId,
      songTitle: data.songTitle,
      artist: data.artist,
      interpretation: data.interpretation,
      author: data.author,
      authorId: user.uid,
      rating: 0,
      viewCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'tafsiran'), tafsirData);
    console.log('✅ Tafsiran created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error adding tafsiran:', error);
    throw error;
  }
}

/**
 * Get semua tafsiran untuk lagu tertentu
 */
export async function getTafsiranByGeniusId(geniusId) {
  try {
    const q = query(
      collection(db, 'tafsiran'),
      where('geniusId', '==', geniusId),
      orderBy('rating', 'desc')
    );

    const snapshot = await getDocs(q);
    const tafsiran = [];

    snapshot.forEach((doc) => {
      tafsiran.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return tafsiran;
  } catch (error) {
    console.error('❌ Error fetching tafsiran:', error);
    return [];
  }
}

/**
 * Get tafsiran by ID
 */
export async function getTafsiranById(tafsirId) {
  try {
    const docRef = doc(db, 'tafsiran', tafsirId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching tafsiran:', error);
    return null;
  }
}

/**
 * Get tafsiran terbaru (untuk homepage)
 */
export async function getRecentTafsiran(limitCount = 10) {
  try {
    const q = query(
      collection(db, 'tafsiran'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const tafsiran = [];

    snapshot.forEach((doc) => {
      tafsiran.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return tafsiran;
  } catch (error) {
    console.error('❌ Error fetching recent tafsiran:', error);
    return [];
  }
}

/**
 * Get tafsiran terpopuler
 */
export async function getPopularTafsiran(limitCount = 10) {
  try {
    const q = query(
      collection(db, 'tafsiran'),
      orderBy('rating', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const tafsiran = [];

    snapshot.forEach((doc) => {
      tafsiran.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return tafsiran;
  } catch (error) {
    console.error('❌ Error fetching popular tafsiran:', error);
    return [];
  }
}

/**
 * Update view count
 */
export async function incrementViewCount(tafsirId) {
  try {
    const docRef = doc(db, 'tafsiran', tafsirId);
    await updateDoc(docRef, {
      viewCount: increment(1)
    });
  } catch (error) {
    console.error('❌ Error updating view count:', error);
  }
}

/**
 * Delete tafsiran (only by author)
 */
export async function deleteTafsiran(tafsirId) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Check if user is the author
    const tafsir = await getTafsiranById(tafsirId);
    if (tafsir.authorId !== user.uid) {
      throw new Error('Unauthorized: You can only delete your own tafsiran');
    }

    await deleteDoc(doc(db, 'tafsiran', tafsirId));
    console.log('✅ Tafsiran deleted');
  } catch (error) {
    console.error('❌ Error deleting tafsiran:', error);
    throw error;
  }
}

// ============================================
// COMMENTS FUNCTIONS
// ============================================

/**
 * Add comment
 */
export async function addComment(tafsirId, author, content) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const commentData = {
      tafsirId: tafsirId,
      author: author,
      authorId: user.uid,
      content: content,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'comments'), commentData);
    console.log('✅ Comment added:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error adding comment:', error);
    throw error;
  }
}

/**
 * Get comments for tafsiran
 */
export async function getCommentsByTafsirId(tafsirId) {
  try {
    const q = query(
      collection(db, 'comments'),
      where('tafsirId', '==', tafsirId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const comments = [];

    snapshot.forEach((doc) => {
      comments.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return comments;
  } catch (error) {
    console.error('❌ Error fetching comments:', error);
    return [];
  }
}

/**
 * Delete comment
 */
export async function deleteComment(commentId) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    await deleteDoc(doc(db, 'comments', commentId));
    console.log('✅ Comment deleted');
  } catch (error) {
    console.error('❌ Error deleting comment:', error);
    throw error;
  }
}

// ============================================
// RATINGS/LIKES FUNCTIONS
// ============================================

/**
 * Like/Unlike tafsiran
 */
export async function toggleLike(tafsirId) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Check if user already liked
    const q = query(
      collection(db, 'ratings'),
      where('tafsirId', '==', tafsirId),
      where('userId', '==', user.uid)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // User belum like, tambah like
      await addDoc(collection(db, 'ratings'), {
        tafsirId: tafsirId,
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      // Increment rating count
      const tafsirRef = doc(db, 'tafsiran', tafsirId);
      await updateDoc(tafsirRef, {
        rating: increment(1)
      });

      console.log('✅ Liked');
      return true; // liked
    } else {
      // User udah like, hapus like (unlike)
      snapshot.forEach(async (docSnapshot) => {
        await deleteDoc(doc(db, 'ratings', docSnapshot.id));
      });

      // Decrement rating count
      const tafsirRef = doc(db, 'tafsiran', tafsirId);
      await updateDoc(tafsirRef, {
        rating: increment(-1)
      });

      console.log('✅ Unliked');
      return false; // unliked
    }
  } catch (error) {
    console.error('❌ Error toggling like:', error);
    throw error;
  }
}

/**
 * Check if user has liked tafsiran
 */
export async function hasUserLiked(tafsirId) {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    const q = query(
      collection(db, 'ratings'),
      where('tafsirId', '==', tafsirId),
      where('userId', '==', user.uid)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('❌ Error checking like status:', error);
    return false;
  }
}

// ============================================
// SONGS CACHE (Optional)
// ============================================

/**
 * Cache song data (opsional, biar ga perlu fetch Genius terus)
 */
export async function cacheSongData(songData) {
  try {
    const docRef = doc(db, 'songs', songData.geniusId.toString());
    await updateDoc(docRef, songData).catch(async () => {
      // Kalau belum ada, bikin baru
      await addDoc(collection(db, 'songs'), {
        ...songData,
        cachedAt: serverTimestamp()
      });
    });
    console.log('✅ Song cached');
  } catch (error) {
    console.error('❌ Error caching song:', error);
  }
}