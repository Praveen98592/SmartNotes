import axios from 'axios';

// AI Processing with mode selection
export const processContentWithAi = async (content, mode = "summarize") => {
  //1. Summarize content via Llama 3.2. Vite forwards /api directly to http://localhost:5013/api
  const response = await axios.post('/api/ai/process', {
    content: content,
    mode : mode,
  });
  return response.data;
};


// 2. Fetch all saved notes from the database
export const fetchNotes = async () => {
  const response = await axios.get('/api/notes');
  return response.data;
};

// 3. Save a new note with its AI summary
export const saveNoteToDb = async (note) => {
  const response = await axios.post('/api/notes', note);
  return response.data;
};

// 4. Delete a note by its ID
export const deleteNoteFromDb = async (id) => {
  await axios.delete(`/api/notes/${id}`);
};