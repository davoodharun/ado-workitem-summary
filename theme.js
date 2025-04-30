import { extendTheme } from '@chakra-ui/react'

// Create a custom theme with dark mode as default
const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  styles: {
    global: {
      body: {
        bg: 'gray.800',
        color: 'white'
      }
    }
  },
  colors: {
    // Add custom colors here if needed
  },
  components: {
    Button: {
      variants: {
        outline: {
          color: 'white',
          _hover: {
            color: 'white'
          }
        }
      }
    }
  }
})

export default theme 