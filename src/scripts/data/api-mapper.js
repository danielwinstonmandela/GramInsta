import Map from '../utils/map';

export async function storyMapper(story) {
  if (!story.lat || !story.lon) {
    return {
      id: story.id,
      title: story.description.substring(0, 50) + (story.description.length > 50 ? '...' : ''), 
      description: story.description,
      photoUrl: story.photoUrl,
      createdAt: story.createdAt,
      reporter: {
        name: story.name,
      },
      location: null,
      evidenceImages: story.photoUrl ? [{ imageUrl: story.photoUrl }] : [], 
    };
  }

  let placeName = `${story.lat}, ${story.lon}`; 
  
  try {
    placeName = await Map.getPlaceNameByCoordinate(story.lat, story.lon);
  } catch (error) {
    console.warn('Could not get place name for coordinates, using lat/lon instead:', error);
  }

  return {
    id: story.id,
    title: story.description.substring(0, 50) + (story.description.length > 50 ? '...' : ''), 
    description: story.description,
    photoUrl: story.photoUrl,
    createdAt: story.createdAt,
    reporter: {
      name: story.name,
    },
    location: {
      latitude: story.lat,
      longitude: story.lon,
      placeName: placeName,
    },
    evidenceImages: story.photoUrl ? [{ imageUrl: story.photoUrl }] : [], 
  };
}
