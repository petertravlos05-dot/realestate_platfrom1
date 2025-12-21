// Simple test script to check if the property view API works
const testPropertyViewCheck = async () => {
  try {
    // Test the GET endpoint
    const response = await fetch('http://localhost:3004/api/properties/cmbakrrj60009ny04xxv8s3py/view', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Property view check response:', data);
    } else {
      console.error('Error checking property view:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testPropertyViewCheck(); 